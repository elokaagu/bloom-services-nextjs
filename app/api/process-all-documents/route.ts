import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PROCESS ALL DOCUMENTS API START ===");

    const supabase = supabaseService();

    // Get all documents that don't have chunks yet
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select(
        `
        id,
        title,
        storage_path,
        status,
        workspace_id
      `
      )
      .eq("workspace_id", "550e8400-e29b-41d4-a716-446655440001") // Default workspace
      .in("status", ["uploading", "failed", "ready"]); // Include ready to re-process if needed

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: `Failed to fetch documents: ${docsError.message}` },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      console.log("No documents found to process");
      return NextResponse.json({
        success: true,
        message: "No documents found to process",
        processed: 0,
      });
    }

    console.log(`Found ${documents.length} documents to process.`);
    const results = [];

    for (const doc of documents) {
      // Check if chunks already exist for this document
      const { count: chunksCount, error: chunksCountError } = await supabase
        .from("document_chunks")
        .select("id", { count: "exact" })
        .eq("document_id", doc.id);

      if (chunksCountError) {
        console.error(
          `Error checking chunks for document ${doc.id}:`,
          chunksCountError
        );
        results.push({
          documentId: doc.id,
          title: doc.title,
          success: false,
          error: `Failed to check existing chunks: ${chunksCountError.message}`,
        });
        continue;
      }

      if (chunksCount && chunksCount > 0) {
        console.log(
          `Document ${doc.title} (${doc.id}) already has ${chunksCount} chunks. Skipping ingestion.`
        );
        results.push({
          documentId: doc.id,
          title: doc.title,
          success: true,
          message: "Already processed",
          chunks: chunksCount,
        });
        continue;
      }

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
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: true,
            chunks: ingestResult.chunks || 0,
          });
        } else {
          const errorData = await ingestResponse.json();
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: false,
            error: errorData.error,
          });
          // Update document status to failed if ingestion failed
          await supabase
            .from("documents")
            .update({ status: "failed", error: errorData.error })
            .eq("id", doc.id);
        }
      } catch (error: any) {
        console.error(`Error processing document ${doc.id}:`, error);
        results.push({
          documentId: doc.id,
          title: doc.title,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Update document status to failed
        await supabase
          .from("documents")
          .update({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", doc.id);
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `Processing complete: ${successful} successful, ${failed} failed`
    );
    console.log("=== PROCESS ALL DOCUMENTS API SUCCESS ===");

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
  } catch (e: any) {
    console.error("=== PROCESS ALL DOCUMENTS API ERROR ===", e);
    return NextResponse.json(
      {
        error: e.message,
        stack: e.stack,
      },
      { status: 500 }
    );
  }
}
