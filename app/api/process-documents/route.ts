import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PROCESS DOCUMENTS API START ===");
    
    const supabase = supabaseService();
    
    // Get all documents that don't have chunks yet
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status")
      .eq("workspace_id", "550e8400-e29b-41d4-a716-446655440001") // Policy Research workspace
      .in("status", ["ready", "processing"]);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch documents", details: docsError.message },
        { status: 500 }
      );
    }

    console.log(`Found ${documents?.length || 0} documents to process`);

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No documents found to process",
        processed: 0
      });
    }

    const results = [];
    
    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.title} (${doc.id})`);
        
        // Trigger ingestion for this document
        const ingestResponse = await fetch(
          `${req.nextUrl.origin}/api/ingest`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: doc.id }),
          }
        );

        if (ingestResponse.ok) {
          const ingestResult = await ingestResponse.json();
          console.log(`Document ${doc.title} processed successfully`);
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: true,
            chunks: ingestResult.chunks || 0
          });
        } else {
          const errorData = await ingestResponse.json();
          console.error(`Failed to process ${doc.title}:`, errorData);
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: false,
            error: errorData.error
          });
        }
      } catch (error) {
        console.error(`Error processing ${doc.title}:`, error);
        results.push({
          documentId: doc.id,
          title: doc.title,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Processing complete: ${successful} successful, ${failed} failed`);
    console.log("=== PROCESS DOCUMENTS API SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: `Processed ${successful} documents successfully, ${failed} failed`,
      results,
      summary: {
        total: documents.length,
        successful,
        failed
      }
    });

  } catch (e: any) {
    console.error("=== PROCESS DOCUMENTS API ERROR ===", e);
    return NextResponse.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
