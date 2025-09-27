import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PROCESS FAILED DOCUMENT START ===");

    const supabase = supabaseService();

    // Get the most recent failed document
    const { data: failedDocs, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error fetching failed documents:", fetchError);
      return NextResponse.json(
        { error: "Database error", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!failedDocs || failedDocs.length === 0) {
      return NextResponse.json(
        { message: "No failed documents found" },
        { status: 404 }
      );
    }

    const document = failedDocs[0];
    console.log(`Processing failed document: ${document.title} (${document.id})`);
    console.log(`Storage path: ${document.storage_path}`);

    // Check if file exists in storage
    console.log("Checking if file exists in storage...");
    const { data: fileData, error: fileError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .download(document.storage_path);

    if (fileError) {
      console.error("File not found in storage:", fileError);
      return NextResponse.json(
        { 
          error: "File not found in storage", 
          details: fileError.message,
          storagePath: document.storage_path,
          bucket: process.env.STORAGE_BUCKET || "documents"
        },
        { status: 404 }
      );
    }

    console.log("File found in storage, size:", fileData.size);

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", document.id);

    // Trigger ingestion
    const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });

    if (!ingestResponse.ok) {
      const errorData = await ingestResponse.text();
      console.error("Ingest API failed:", errorData);
      
      await supabase
        .from("documents")
        .update({ status: "failed", error: errorData })
        .eq("id", document.id);

      return NextResponse.json({
        success: false,
        error: "Ingest API failed",
        details: errorData,
        document: {
          id: document.id,
          title: document.title,
          status: "failed",
        },
      });
    }

    const ingestResult = await ingestResponse.json();
    console.log("Ingest API successful:", ingestResult);

    // Check if chunks were created
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no, text")
      .eq("document_id", document.id)
      .order("chunk_no");

    if (chunksError) {
      console.error("Error checking chunks:", chunksError);
    }

    console.log(`Document processed successfully with ${chunks?.length || 0} chunks`);

    return NextResponse.json({
      success: true,
      message: "Document processed successfully",
      document: {
        id: document.id,
        title: document.title,
        status: "ready",
      },
      chunks: chunks?.length || 0,
    });

  } catch (error) {
    console.error("=== PROCESS FAILED DOCUMENT ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
