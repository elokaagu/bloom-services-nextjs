import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== MANUAL INGESTION TEST START ===");
    
    const supabase = supabaseService();
    
    // Get all ready documents that don't have chunks
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "ready")
      .not("storage_path", "is", null);
    
    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json({ 
        error: "No ready documents found",
        details: docsError?.message 
      }, { status: 404 });
    }
    
    console.log("Found", documents.length, "ready documents");
    
    const results = [];
    
    for (const document of documents) {
      console.log(`\n=== PROCESSING DOCUMENT: ${document.title} ===`);
      
      try {
        // Check if document already has chunks
        const { data: existingChunks } = await supabase
          .from("document_chunks")
          .select("id")
          .eq("document_id", document.id)
          .limit(1);
        
        if (existingChunks && existingChunks.length > 0) {
          console.log(`Document ${document.title} already has chunks, skipping`);
          results.push({
            documentId: document.id,
            title: document.title,
            status: "skipped",
            reason: "Already has chunks"
          });
          continue;
        }
        
        // Try to download the file
        const { data: fileData, error: fileError } = await supabase.storage
          .from("documents")
          .download(document.storage_path);
        
        if (fileError) {
          console.error(`Storage error for ${document.title}:`, fileError);
          results.push({
            documentId: document.id,
            title: document.title,
            status: "failed",
            error: `Storage error: ${fileError.message}`
          });
          continue;
        }
        
        const buffer = Buffer.from(await fileData.arrayBuffer());
        console.log(`File downloaded for ${document.title}, size:`, buffer.length, "bytes");
        
        // Try to parse the file
        let text = "";
        if (document.title.endsWith(".pdf")) {
          try {
            const pdfParse = await import("pdf-parse");
            const parsed = await pdfParse.default(buffer);
            text = parsed.text;
            console.log(`PDF parsed for ${document.title}, text length:`, text.length);
          } catch (error: any) {
            console.error(`PDF parsing error for ${document.title}:`, error);
            results.push({
              documentId: document.id,
              title: document.title,
              status: "failed",
              error: `PDF parsing failed: ${error.message}`
            });
            continue;
          }
        } else {
          text = buffer.toString("utf-8");
          console.log(`Text extracted for ${document.title}, length:`, text.length);
        }
        
        if (!text || text.trim().length === 0) {
          console.error(`No text content for ${document.title}`);
          results.push({
            documentId: document.id,
            title: document.title,
            status: "failed",
            error: "No text content extracted"
          });
          continue;
        }
        
        // Create simple chunks
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const chunks = [];
        
        for (let i = 0; i < paragraphs.length; i++) {
          const paragraph = paragraphs[i].trim();
          if (paragraph.length > 50) {
            chunks.push({
              document_id: document.id,
              chunk_no: i + 1,
              text: paragraph,
              embedding: new Array(1536).fill(0.1), // Dummy embedding
            });
          }
        }
        
        console.log(`Created ${chunks.length} chunks for ${document.title}`);
        
        if (chunks.length === 0) {
          console.error(`No valid chunks created for ${document.title}`);
          results.push({
            documentId: document.id,
            title: document.title,
            status: "failed",
            error: "No valid chunks created"
          });
          continue;
        }
        
        // Insert chunks
        const { data: insertedChunks, error: insertError } = await supabase
          .from("document_chunks")
          .insert(chunks)
          .select();
        
        if (insertError) {
          console.error(`Error inserting chunks for ${document.title}:`, insertError);
          results.push({
            documentId: document.id,
            title: document.title,
            status: "failed",
            error: `Database insert failed: ${insertError.message}`
          });
          continue;
        }
        
        console.log(`✅ Successfully processed ${document.title} - ${chunks.length} chunks created`);
        results.push({
          documentId: document.id,
          title: document.title,
          status: "success",
          chunksCreated: chunks.length,
          textLength: text.length
        });
        
      } catch (error: any) {
        console.error(`Error processing ${document.title}:`, error);
        results.push({
          documentId: document.id,
          title: document.title,
          status: "failed",
          error: error.message
        });
      }
    }
    
    console.log("=== MANUAL INGESTION TEST COMPLETE ===");
    
    return NextResponse.json({
      success: true,
      message: `Processed ${documents.length} documents`,
      results: results,
      summary: {
        total: documents.length,
        successful: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "failed").length,
        skipped: results.filter(r => r.status === "skipped").length
      }
    });
    
  } catch (error: any) {
    console.error("=== MANUAL INGESTION TEST ERROR ===", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
