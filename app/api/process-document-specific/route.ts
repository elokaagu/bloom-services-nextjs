import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== MANUAL DOCUMENT PROCESSING START ===");

    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const supabase = supabaseService();

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.error("Document not found:", docError);
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    console.log(`Processing document: ${document.title} (${document.id})`);
    console.log(`Current status: ${document.status}`);
    console.log(`Storage path: ${document.storage_path}`);

    // Check if document already has chunks
    const { data: existingChunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id")
      .eq("document_id", documentId);

    if (chunksError) {
      console.error("Error checking existing chunks:", chunksError);
      return NextResponse.json(
        { error: `Failed to check existing chunks: ${chunksError.message}` },
        { status: 500 }
      );
    }

    if (existingChunks && existingChunks.length > 0) {
      console.log(`Document already has ${existingChunks.length} chunks`);
      return NextResponse.json({
        success: true,
        message: "Document already processed",
        chunksCount: existingChunks.length,
        document: {
          id: document.id,
          title: document.title,
          status: document.status,
        },
      });
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    console.log("Document status updated to processing");

    // Trigger ingestion
    const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });

    if (!ingestResponse.ok) {
      const errorData = await ingestResponse.json();
      console.error("Ingest API failed:", errorData);

      await supabase
        .from("documents")
        .update({ status: "failed", error: errorData.error })
        .eq("id", documentId);

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
    const { data: chunks, error: newChunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no, text")
      .eq("document_id", documentId)
      .order("chunk_no");

    if (newChunksError) {
      console.error("Error checking new chunks:", newChunksError);
    }

    if (chunks && chunks.length > 0) {
      // Update status to ready
      await supabase
        .from("documents")
        .update({ status: "ready" })
        .eq("id", documentId);

      console.log(
        `Document processed successfully with ${chunks.length} chunks`
      );

      return NextResponse.json({
        success: true,
        message: `Document ${document.title} processed successfully`,
        document: {
          id: document.id,
          title: document.title,
          status: "ready",
        },
        chunksCreated: chunks.length,
        chunksPreview: chunks.slice(0, 2).map((c) => ({
          chunkNo: c.chunk_no,
          textPreview: c.text.substring(0, 100) + "...",
        })),
      });
    } else {
      console.error("No chunks were created");
      await supabase
        .from("documents")
        .update({ status: "failed", error: "No chunks created" })
        .eq("id", documentId);

      return NextResponse.json({
        success: false,
        error: "No chunks were created",
        document: {
          id: document.id,
          title: document.title,
          status: "failed",
        },
      });
    }
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
