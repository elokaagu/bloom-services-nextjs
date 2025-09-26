import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== MANUAL DOCUMENT PROCESSING START ===");

    const { workspaceId } = await req.json();
    const targetWorkspaceId = workspaceId || "550e8400-e29b-41d4-a716-446655440001";

    const supabase = supabaseService();

    // Get all documents in the workspace that need processing
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status, storage_path")
      .eq("workspace_id", targetWorkspaceId)
      .in("status", ["uploading", "failed"]); // Only process documents that need it

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: `Failed to fetch documents: ${docsError.message}` },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No documents need processing",
        processed: 0,
      });
    }

    console.log(`Found ${documents.length} documents to process`);

    const results = [];

    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.title} (${doc.id})`);

        // Update status to processing
        await supabase
          .from("documents")
          .update({ status: "processing" })
          .eq("id", doc.id);

        // Trigger ingestion
        const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: doc.id }),
        });

        if (ingestResponse.ok) {
          const ingestResult = await ingestResponse.json();
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: true,
            chunks: ingestResult.chunks || 0,
          });
          console.log(`Successfully processed ${doc.title}`);
        } else {
          const errorData = await ingestResponse.json();
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: false,
            error: errorData.error,
          });
          console.error(`Failed to process ${doc.title}:`, errorData.error);
        }
      } catch (error: any) {
        console.error(`Error processing document ${doc.id}:`, error);
        results.push({
          documentId: doc.id,
          title: doc.title,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Processing complete: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Processing complete: ${successful} successful, ${failed} failed`,
      results,
      summary: {
        total: documents.length,
        successful,
        failed,
      },
    });
  } catch (error: any) {
    console.error("=== MANUAL DOCUMENT PROCESSING ERROR ===", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}