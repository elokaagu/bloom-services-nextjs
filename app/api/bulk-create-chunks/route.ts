import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== BULK CHUNK CREATION START ===");

    const supabase = supabaseService();

    // Get all ready documents that don't have chunks
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select(
        `
        *,
        document_chunks(count)
      `
      )
      .eq("status", "ready")
      .not("storage_path", "is", null);

    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json(
        {
          error: "No ready documents found",
          details: docsError?.message,
        },
        { status: 404 }
      );
    }

    // Filter documents that need chunk creation
    const documentsToProcess = documents.filter((doc) => {
      const chunkCount = doc.document_chunks?.[0]?.count || 0;
      return chunkCount === 0;
    });

    console.log(
      `Found ${documentsToProcess.length} documents that need chunk creation`
    );

    if (documentsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All documents already have chunks",
        processedCount: 0,
        totalDocuments: documents.length,
      });
    }

    const results = [];

    // Process each document
    for (const document of documentsToProcess) {
      console.log(`\n=== PROCESSING: ${document.title} ===`);

      try {
        // Call the create-chunks API for this document
        const createChunksResponse = await fetch(
          `${req.nextUrl.origin}/api/create-chunks`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: document.id }),
          }
        );

        const createChunksResult = await createChunksResponse.json();

        results.push({
          documentId: document.id,
          title: document.title,
          success: createChunksResult.success,
          chunksCreated: createChunksResult.chunksCreated || 0,
          chunksFailed: createChunksResult.chunksFailed || 0,
          error: createChunksResult.error || null,
        });

        console.log(
          `✅ ${document.title}: ${
            createChunksResult.chunksCreated || 0
          } chunks created`
        );

        // Add delay between documents to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`❌ Error processing ${document.title}:`, error);
        results.push({
          documentId: document.id,
          title: document.title,
          success: false,
          chunksCreated: 0,
          chunksFailed: 0,
          error: error.message,
        });
      }
    }

    // Calculate summary
    const summary = {
      totalDocuments: documentsToProcess.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalChunksCreated: results.reduce(
        (sum, r) => sum + (r.chunksCreated || 0),
        0
      ),
      totalChunksFailed: results.reduce(
        (sum, r) => sum + (r.chunksFailed || 0),
        0
      ),
    };

    console.log("=== BULK CHUNK CREATION COMPLETE ===");
    console.log("Summary:", summary);

    return NextResponse.json({
      success: summary.successful > 0,
      message: `Processed ${summary.totalDocuments} documents`,
      summary: summary,
      results: results,
    });
  } catch (error: any) {
    console.error("=== BULK CHUNK CREATION ERROR ===", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
