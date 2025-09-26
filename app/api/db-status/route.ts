import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DATABASE STATUS CHECK START ===");

    const supabase = supabaseService();

    // Check documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status, storage_path")
      .eq("workspace_id", "550e8400-e29b-41d4-a716-446655440001");

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch documents", details: docsError.message },
        { status: 500 }
      );
    }

    // Check chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, document_id, chunk_no")
      .limit(10);

    if (chunksError) {
      console.error("Error fetching chunks:", chunksError);
      return NextResponse.json(
        { error: "Failed to fetch chunks", details: chunksError.message },
        { status: 500 }
      );
    }

    console.log("=== DATABASE STATUS CHECK SUCCESS ===");

    return NextResponse.json({
      success: true,
      documents: documents || [],
      chunks: chunks || [],
      summary: {
        documentCount: documents?.length || 0,
        chunkCount: chunks?.length || 0,
        documentsWithChunks: new Set(chunks?.map(c => c.document_id) || []).size,
      },
    });
  } catch (e: any) {
    console.error("=== DATABASE STATUS CHECK ERROR ===", e);
    return NextResponse.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
