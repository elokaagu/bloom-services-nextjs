import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return dummy embedding if OpenAI fails
    return new Array(1536).fill(0.1);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== DIRECT CHUNK CREATION START ===");
    
    const supabase = supabaseService();
    
    // Get all ready documents that don't have chunks
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select(`
        *,
        document_chunks(count)
      `)
      .eq("status", "ready")
      .not("storage_path", "is", null);
    
    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json({ 
        error: "No ready documents found",
        details: docsError?.message 
      }, { status: 404 });
    }
    
    // Filter documents that need chunk creation
    const documentsToProcess = documents.filter(doc => {
      const chunkCount = doc.document_chunks?.[0]?.count || 0;
      return chunkCount === 0;
    });
    
    console.log(`Found ${documentsToProcess.length} documents that need chunk creation`);
    
    if (documentsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All documents already have chunks",
        processedCount: 0,
        totalDocuments: documents.length
      });
    }
    
    const results = [];
    
    // Process each document directly (no internal API calls)
    for (const document of documentsToProcess) {
      console.log(`\n=== PROCESSING: ${document.title} ===`);
      
      try {
        // Update status to processing
        await supabase
          .from("documents")
          .update({ status: "processing" })
          .eq("id", document.id);
        
        // Download file from storage
        let text = "";
        try {
          console.log("Downloading file from storage...");
          const { data: fileData, error: fileError } = await supabase.storage
            .from("documents")
            .download(document.storage_path);
          
          if (fileError) {
            throw new Error(`Storage error: ${fileError.message}`);
          }
          
          const buffer = Buffer.from(await fileData.arrayBuffer());
          console.log("File downloaded, size:", buffer.length, "bytes");
          
          // Parse based on file type
          if (document.title.endsWith(".pdf")) {
            console.log("Parsing PDF file...");
            const pdfParse = await import("pdf-parse");
            const parsed = await pdfParse.default(buffer);
            text = parsed.text;
            console.log("PDF parsed, text length:", text.length);
          } else if (document.title.endsWith(".docx")) {
            console.log("Parsing DOCX file...");
            const mammoth = await import("mammoth");
            const parsed = await mammoth.default.extractRawText({ buffer });
            text = parsed.value;
            console.log("DOCX parsed, text length:", text.length);
          } else {
            console.log("Parsing as plain text...");
            text = buffer.toString("utf-8");
            console.log("Text parsed, length:", text.length);
          }
          
          if (!text || text.trim().length === 0) {
            throw new Error("No text content extracted from document");
          }
          
          // Clean text
          text = text.replace(/\s+/g, " ").trim();
          console.log("Text cleaned, final length:", text.length);
          
        } catch (parseError: any) {
          console.error("File parsing error:", parseError);
          await supabase
            .from("documents")
            .update({ 
              status: "failed", 
              error: `File parsing failed: ${parseError.message}` 
            })
            .eq("id", document.id);
          
          results.push({
            documentId: document.id,
            title: document.title,
            success: false,
            chunksCreated: 0,
            chunksFailed: 0,
            error: `File parsing failed: ${parseError.message}`
          });
          continue;
        }
        
        // Create chunks using simple paragraph splitting
        console.log("Creating chunks...");
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const chunks = [];
        
        for (let i = 0; i < paragraphs.length; i++) {
          const paragraph = paragraphs[i].trim();
          if (paragraph.length > 50) { // Only chunks with substantial content
            chunks.push({
              document_id: document.id,
              chunk_no: i + 1,
              text: paragraph,
            });
          }
        }
        
        console.log(`Created ${chunks.length} chunks from ${paragraphs.length} paragraphs`);
        
        if (chunks.length === 0) {
          console.error("No valid chunks created");
          await supabase
            .from("documents")
            .update({ 
              status: "failed", 
              error: "No valid chunks could be created" 
            })
            .eq("id", document.id);
          
          results.push({
            documentId: document.id,
            title: document.title,
            success: false,
            chunksCreated: 0,
            chunksFailed: 0,
            error: "No valid chunks created"
          });
          continue;
        }
        
        // Generate embeddings and insert chunks
        console.log("Generating embeddings and inserting chunks...");
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < chunks.length; i++) {
          try {
            const chunk = chunks[i];
            
            // Generate embedding
            const embedding = await generateEmbedding(chunk.text);
            
            // Insert chunk with embedding
            const { error: insertError } = await supabase
              .from("document_chunks")
              .insert([{
                document_id: chunk.document_id,
                chunk_no: chunk.chunk_no,
                text: chunk.text,
                embedding: embedding
              }]);
            
            if (insertError) {
              console.error(`Error inserting chunk ${i + 1}:`, insertError);
              errorCount++;
            } else {
              successCount++;
            }
            
            // Add small delay to avoid rate limiting
            if (i % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
          } catch (chunkError: any) {
            console.error(`Error processing chunk ${i + 1}:`, chunkError);
            errorCount++;
          }
        }
        
        console.log(`Chunk processing complete: ${successCount} successful, ${errorCount} failed`);
        
        // Update document status
        if (successCount > 0) {
          await supabase
            .from("documents")
            .update({ 
              status: "ready",
              error: errorCount > 0 ? `${errorCount} chunks failed to process` : null
            })
            .eq("id", document.id);
          
          console.log("Document marked as ready");
        } else {
          await supabase
            .from("documents")
            .update({ 
              status: "failed", 
              error: "All chunks failed to process" 
            })
            .eq("id", document.id);
          
          console.log("Document marked as failed");
        }
        
        results.push({
          documentId: document.id,
          title: document.title,
          success: successCount > 0,
          chunksCreated: successCount,
          chunksFailed: errorCount,
          error: successCount === 0 ? "All chunks failed to process" : null
        });
        
        console.log(`✅ ${document.title}: ${successCount} chunks created`);
        
        // Add delay between documents to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.error(`❌ Error processing ${document.title}:`, error);
        results.push({
          documentId: document.id,
          title: document.title,
          success: false,
          chunksCreated: 0,
          chunksFailed: 0,
          error: error.message
        });
      }
    }
    
    // Calculate summary
    const summary = {
      totalDocuments: documentsToProcess.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalChunksCreated: results.reduce((sum, r) => sum + (r.chunksCreated || 0), 0),
      totalChunksFailed: results.reduce((sum, r) => sum + (r.chunksFailed || 0), 0)
    };
    
    console.log("=== DIRECT CHUNK CREATION COMPLETE ===");
    console.log("Summary:", summary);
    
    return NextResponse.json({
      success: summary.successful > 0,
      message: `Processed ${summary.totalDocuments} documents`,
      summary: summary,
      results: results
    });
    
  } catch (error: any) {
    console.error("=== DIRECT CHUNK CREATION ERROR ===", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
