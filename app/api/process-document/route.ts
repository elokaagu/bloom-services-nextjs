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

    console.log("Processing document:", documentId);

    // Trigger the ingest API
    const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });

    if (!ingestResponse.ok) {
      const errorData = await ingestResponse.json();
      console.error("Ingest API failed:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: "Ingest API failed",
          details: errorData,
        },
        { status: 500 }
      );
    }

    const ingestResult = await ingestResponse.json();
    console.log("Ingest API success:", ingestResult);

    // Check the result
    const supabase = supabaseService();
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no")
      .eq("document_id", documentId);

    console.log("=== MANUAL DOCUMENT PROCESSING SUCCESS ===");

    return NextResponse.json({
      success: true,
      ingestResult,
      chunksCreated: chunks?.length || 0,
      chunksError: chunksError?.message,
    });
  } catch (error) {
    console.error("=== MANUAL DOCUMENT PROCESSING ERROR ===", error);
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
