import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PROCESS DOCUMENT API START ===");

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

    // Check if chunks already exist
    const { count: existingChunks } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact" })
      .eq("document_id", documentId);

    if (existingChunks && existingChunks > 0) {
      console.log(`Document already has ${existingChunks} chunks`);
      return NextResponse.json({
        success: true,
        message: `Document already processed with ${existingChunks} chunks`,
        chunks: existingChunks,
      });
    }

    // Trigger ingestion
    const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });

    if (!ingestResponse.ok) {
      const errorData = await ingestResponse.json();
      console.error("Ingest failed:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: "Ingest failed",
          details: errorData,
        },
        { status: 500 }
      );
    }

    const ingestResult = await ingestResponse.json();
    console.log("Ingest successful:", ingestResult);

    // Check final chunk count
    const { count: finalChunks } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact" })
      .eq("document_id", documentId);

    console.log("=== PROCESS DOCUMENT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: `Document processed successfully`,
      chunksCreated: ingestResult.chunks || 0,
      finalChunks: finalChunks || 0,
      document: {
        id: document.id,
        title: document.title,
        status: "ready",
      },
    });
  } catch (error) {
    console.error("=== PROCESS DOCUMENT API ERROR ===", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
