import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { advancedPDFProcessor } from "@/lib/advanced-pdf-processor";
import OpenAI from "openai";
import { simpleChunk } from "@/lib/simple-chunk";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    console.log("=== MANUAL DOCUMENT PROCESSING START ===");
    
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }
    
    const supabase = supabaseService();
    
    // Get the document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    
    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    console.log("Processing document:", document.title);
    console.log("Document status:", document.status);
    console.log("Storage path:", document.storage_path);
    
    if (!document.storage_path) {
      return NextResponse.json({ error: "No storage path found" }, { status: 400 });
    }
    
    // Download the file from storage
    console.log("Downloading file from storage...");
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(document.storage_path);
    
    if (fileError) {
      console.error("Storage error:", fileError);
      return NextResponse.json({ error: `Storage error: ${fileError.message}` }, { status: 500 });
    }
    
    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log("File downloaded, size:", buffer.length, "bytes");
    
    // Process the file based on type
    let text = "";
    let metadata = {};
    
    if (document.title.endsWith(".pdf")) {
      console.log("Processing PDF with advanced processor...");
      const result = await advancedPDFProcessor.processPDF(buffer);
      text = result.formattedText;
      metadata = result.metadata;
      
      // Update document with metadata and page data
      await supabase
        .from("documents")
        .update({
          metadata: result.metadata,
          page_data: result.pages.map(page => ({
            pageNumber: page.pageNumber,
            imageData: page.imageData,
            text: page.text,
            formattedText: page.formattedText,
          })),
        })
        .eq("id", documentId);
      
      console.log("PDF processed, text length:", text.length);
    } else if (document.title.endsWith(".docx")) {
      console.log("Processing DOCX file...");
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      console.log("DOCX processed, text length:", text.length);
    } else {
      console.log("Processing as plain text...");
      text = buffer.toString("utf-8");
      console.log("Text processed, length:", text.length);
    }
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text content extracted" }, { status: 400 });
    }
    
    // Clean the text
    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    
    console.log("Text cleaned, length:", cleanedText.length);
    
    // Create chunks
    console.log("Creating chunks...");
    const chunks = simpleChunk(cleanedText, {
      maxChunkSize: 1000,
      overlap: 200,
    });
    
    console.log("Created", chunks.length, "chunks");
    
    // Generate embeddings for each chunk
    console.log("Generating embeddings...");
    const chunkPromises = chunks.map(async (chunk, index) => {
      try {
        console.log(`Generating embedding for chunk ${index + 1}/${chunks.length}`);
        
        const embeddingResponse = await openai.embeddings.create({
          model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
          input: chunk,
        });
        
        const embedding = embeddingResponse.data[0].embedding;
        
        return {
          document_id: documentId,
          text: chunk,
          embedding: embedding,
          chunk_index: index,
        };
      } catch (error) {
        console.error(`Error generating embedding for chunk ${index + 1}:`, error);
        return null;
      }
    });
    
    const chunkData = await Promise.all(chunkPromises);
    const validChunks = chunkData.filter(chunk => chunk !== null);
    
    console.log("Generated embeddings for", validChunks.length, "chunks");
    
    if (validChunks.length === 0) {
      return NextResponse.json({ error: "Failed to generate embeddings" }, { status: 500 });
    }
    
    // Insert chunks into database
    console.log("Inserting chunks into database...");
    const { data: insertedChunks, error: insertError } = await supabase
      .from("document_chunks")
      .insert(validChunks)
      .select();
    
    if (insertError) {
      console.error("Error inserting chunks:", insertError);
      return NextResponse.json({ error: `Database error: ${insertError.message}` }, { status: 500 });
    }
    
    console.log("Inserted", insertedChunks?.length || 0, "chunks");
    
    // Update document status
    await supabase
      .from("documents")
      .update({ 
        status: "ready",
        error_message: null 
      })
      .eq("id", documentId);
    
    console.log("Document status updated to ready");
    console.log("=== MANUAL DOCUMENT PROCESSING SUCCESS ===");
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${document.title}`,
      documentId: documentId,
      chunksCreated: validChunks.length,
      textLength: cleanedText.length,
      metadata: metadata,
    });
    
  } catch (error: any) {
    console.error("=== MANUAL DOCUMENT PROCESSING ERROR ===", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}