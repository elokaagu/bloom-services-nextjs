import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== SIMPLE DOCUMENT PROCESSING START ===");
    
    const supabase = supabaseService();
    
    // Get the first ready document
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "ready")
      .not("storage_path", "is", null)
      .limit(1);
    
    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json({ 
        error: "No documents found to process",
        details: docsError?.message 
      }, { status: 404 });
    }
    
    const document = documents[0];
    console.log("Processing document:", document.title);
    
    // Try to download the file
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(document.storage_path);
    
    if (fileError) {
      console.error("Storage error:", fileError);
      return NextResponse.json({ 
        error: "Storage error",
        details: fileError.message,
        storagePath: document.storage_path
      }, { status: 500 });
    }
    
    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log("File downloaded, size:", buffer.length, "bytes");
    
    // Simple text extraction for PDF
    let text = "";
    if (document.title.endsWith(".pdf")) {
      try {
        const pdfParse = await import("pdf-parse");
        const parsed = await pdfParse.default(buffer);
        text = parsed.text;
        console.log("PDF parsed, text length:", text.length);
      } catch (error: any) {
        console.error("PDF parsing error:", error);
        return NextResponse.json({ 
          error: "PDF parsing failed",
          details: error.message
        }, { status: 500 });
      }
    } else {
      text = buffer.toString("utf-8");
      console.log("Text extracted, length:", text.length);
    }
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: "No text content extracted",
        textLength: text.length
      }, { status: 400 });
    }
    
    // Create simple chunks (split by paragraphs)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const chunks = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (paragraph.length > 50) { // Only chunks with substantial content
        chunks.push({
          document_id: document.id,
          text: paragraph,
          chunk_index: i,
          embedding: new Array(1536).fill(0.1), // Dummy embedding for now
        });
      }
    }
    
    console.log("Created", chunks.length, "chunks");
    
    if (chunks.length === 0) {
      return NextResponse.json({ 
        error: "No valid chunks created",
        textLength: text.length,
        paragraphCount: paragraphs.length
      }, { status: 400 });
    }
    
    // Insert chunks into database
    const { data: insertedChunks, error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunks)
      .select();
    
    if (insertError) {
      console.error("Error inserting chunks:", insertError);
      return NextResponse.json({ 
        error: "Database insert failed",
        details: insertError.message
      }, { status: 500 });
    }
    
    console.log("Inserted", insertedChunks?.length || 0, "chunks");
    console.log("=== SIMPLE DOCUMENT PROCESSING SUCCESS ===");
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${document.title}`,
      documentId: document.id,
      chunksCreated: chunks.length,
      textLength: text.length,
      sampleText: text.substring(0, 200) + "..."
    });
    
  } catch (error: any) {
    console.error("=== SIMPLE DOCUMENT PROCESSING ERROR ===", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
