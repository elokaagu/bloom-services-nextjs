import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG DOCUMENT API START ===");
    
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    
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

    console.log("Document found:", document.title);

    // Check for chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no, text")
      .eq("document_id", documentId)
      .order("chunk_no");

    // Check storage
    let storageInfo = null;
    if (document.storage_path) {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .download(document.storage_path);
        
        storageInfo = {
          hasFile: !fileError && !!fileData,
          error: fileError?.message,
          path: document.storage_path,
        };
      } catch (storageError: any) {
        storageInfo = {
          hasFile: false,
          error: storageError.message,
          path: document.storage_path,
        };
      }
    }

    console.log("=== DEBUG DOCUMENT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        storage_path: document.storage_path,
        summary: document.summary,
        created_at: document.created_at,
      },
      chunks: {
        count: chunks?.length || 0,
        error: chunksError?.message,
        preview: chunks?.slice(0, 2).map(c => ({
          chunkNo: c.chunk_no,
          textPreview: c.text.substring(0, 100) + (c.text.length > 100 ? "..." : ""),
        })) || [],
      },
      storage: storageInfo,
      recommendations: [
        chunks?.length === 0 ? "Document needs to be processed - run /api/process-document" : null,
        !storageInfo?.hasFile ? "File not found in storage" : null,
        document.status === "uploading" ? "Document still uploading" : null,
        document.status === "failed" ? "Document processing failed" : null,
      ].filter(Boolean),
    });

  } catch (error) {
    console.error("=== DEBUG DOCUMENT API ERROR ===", error);
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
