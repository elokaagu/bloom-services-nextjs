import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PROCESS ALL DOCUMENTS START ===");
    
    const supabase = supabaseService();
    
    // Get all ready documents that don't have chunks
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select(`
        id,
        title,
        status,
        storage_path,
        workspace_id
      `)
      .eq("status", "ready")
      .not("storage_path", "is", null);
    
    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }
    
    console.log("Found", documents?.length || 0, "documents to process");
    
    if (!documents || documents.length === 0) {
      return NextResponse.json({ 
        message: "No documents found to process",
        processed: 0 
      });
    }
    
    const results = [];
    
    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.title}`);
        
        // Check if document already has chunks
        const { data: existingChunks } = await supabase
          .from("document_chunks")
          .select("id")
          .eq("document_id", doc.id)
          .limit(1);
        
        if (existingChunks && existingChunks.length > 0) {
          console.log(`Document ${doc.title} already has chunks, skipping`);
          results.push({
            documentId: doc.id,
            title: doc.title,
            status: "skipped",
            reason: "Already has chunks"
          });
          continue;
        }
        
        // Process the document
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/process-document-manual`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId: doc.id }),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully processed ${doc.title}`);
          results.push({
            documentId: doc.id,
            title: doc.title,
            status: "success",
            chunksCreated: result.chunksCreated,
            textLength: result.textLength
          });
        } else {
          const error = await response.json();
          console.error(`Failed to process ${doc.title}:`, error);
          results.push({
            documentId: doc.id,
            title: doc.title,
            status: "error",
            error: error.error || "Unknown error"
          });
        }
        
      } catch (error: any) {
        console.error(`Error processing ${doc.title}:`, error);
        results.push({
          documentId: doc.id,
          title: doc.title,
          status: "error",
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;
    const skippedCount = results.filter(r => r.status === "skipped").length;
    
    console.log("=== PROCESS ALL DOCUMENTS COMPLETE ===");
    console.log(`Success: ${successCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${documents.length} documents`,
      summary: {
        total: documents.length,
        success: successCount,
        error: errorCount,
        skipped: skippedCount
      },
      results: results
    });
    
  } catch (error: any) {
    console.error("=== PROCESS ALL DOCUMENTS ERROR ===", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}