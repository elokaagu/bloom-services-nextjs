import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PROCESS NATIONAL PROCUREMENT DOCUMENT ===");

    const supabase = supabaseService();

    // Find the National Procurement Statement document
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .ilike("title", "%National Procurement Statement%")
      .single();

    if (docsError || !documents) {
      console.error("National Procurement Statement not found:", docsError);
      return NextResponse.json(
        { error: "National Procurement Statement document not found" },
        { status: 404 }
      );
    }

    const document = documents;
    console.log(`Processing document: ${document.title} (${document.id})`);

    // Check if chunks already exist
    const { count: existingChunks } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact" })
      .eq("document_id", document.id);

    if (existingChunks && existingChunks > 0) {
      console.log(`Document already has ${existingChunks} chunks`);
      return NextResponse.json({
        success: true,
        message: `Document already processed with ${existingChunks} chunks`,
        chunks: existingChunks,
        documentId: document.id,
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
          documentId: document.id,
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
      .eq("document_id", document.id);

    console.log("=== PROCESS COMPLETE ===");

    return NextResponse.json({
      success: true,
      message: `National Procurement Statement processed successfully`,
      chunksCreated: ingestResult.chunks || 0,
      finalChunks: finalChunks || 0,
      document: {
        id: document.id,
        title: document.title,
        status: "ready",
      },
    });
  } catch (error: any) {
    console.error("=== PROCESS ERROR ===", error);
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
