import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== MANUAL CENTRALIS PROCESSING START ===");
    
    const supabase = supabaseService();
    
    // Find the Centralis document
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", "550e8400-e29b-41d4-a716-446655440001")
      .ilike("title", "%centralis%")
      .order("created_at", { ascending: false })
      .limit(1);

    if (docsError || !documents || documents.length === 0) {
      console.error("Centralis document not found:", docsError);
      return NextResponse.json(
        { error: "Centralis document not found" },
        { status: 404 }
      );
    }

    const document = documents[0];
    console.log("Found Centralis document:", document.title, document.id);

    // Check if it already has chunks
    const { data: existingChunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id")
      .eq("document_id", document.id);

    if (chunksError) {
      console.error("Error checking chunks:", chunksError);
    } else {
      console.log("Existing chunks:", existingChunks?.length || 0);
    }

    // If no chunks, trigger ingestion
    if (!existingChunks || existingChunks.length === 0) {
      console.log("No chunks found, triggering ingestion...");
      
      const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      if (!ingestResponse.ok) {
        const errorData = await ingestResponse.json();
        console.error("Ingest API failed:", errorData);
        return NextResponse.json(
          { 
            success: false, 
            error: "Ingest API failed", 
            details: errorData,
            document: {
              id: document.id,
              title: document.title,
              status: document.status,
            }
          },
          { status: 500 }
        );
      }

      const ingestResult = await ingestResponse.json();
      console.log("Ingest API success:", ingestResult);

      // Check chunks again
      const { data: newChunks, error: newChunksError } = await supabase
        .from("document_chunks")
        .select("id, chunk_no, text")
        .eq("document_id", document.id)
        .order("chunk_no");

      console.log("=== MANUAL CENTRALIS PROCESSING SUCCESS ===");

      return NextResponse.json({
        success: true,
        message: "Centralis document processed successfully",
        document: {
          id: document.id,
          title: document.title,
          status: document.status,
        },
        ingestResult,
        chunksCreated: newChunks?.length || 0,
        chunksError: newChunksError?.message,
        chunkPreview: newChunks?.slice(0, 2).map(c => ({
          chunkNo: c.chunk_no,
          textPreview: c.text.substring(0, 100) + (c.text.length > 100 ? "..." : ""),
        })) || [],
      });
    } else {
      console.log("Document already has chunks, no processing needed");
      return NextResponse.json({
        success: true,
        message: "Document already processed",
        document: {
          id: document.id,
          title: document.title,
          status: document.status,
        },
        existingChunks: existingChunks.length,
      });
    }

  } catch (error) {
    console.error("=== MANUAL CENTRALIS PROCESSING ERROR ===", error);
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
