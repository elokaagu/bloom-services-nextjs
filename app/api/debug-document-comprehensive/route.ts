import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== COMPREHENSIVE DOCUMENT DEBUG START ===");

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
    console.log("Document status:", document.status);
    console.log("Document storage_path:", document.storage_path);

    // Check for chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no, text")
      .eq("document_id", documentId)
      .order("chunk_no");

    console.log("Chunks found:", chunks?.length || 0);
    if (chunksError) {
      console.error("Chunks error:", chunksError);
    }

    // Check storage access
    let storageInfo: any = { accessible: false, error: null };
    if (document.storage_path) {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .download(document.storage_path);

        if (fileError) {
          storageInfo.error = fileError.message;
          console.error("Storage error:", fileError);
        } else if (fileData) {
          storageInfo.accessible = true;
          storageInfo.size = (await fileData.arrayBuffer()).byteLength;
          console.log("Storage accessible, file size:", storageInfo.size);
        }
      } catch (storageError: any) {
        storageInfo.error = storageError.message;
        console.error("Storage access error:", storageError);
      }
    } else {
      storageInfo.error = "No storage_path";
    }

    // Test content API
    let contentApiResult: any = null;
    try {
      const contentResponse = await fetch(
        `${req.nextUrl.origin}/api/documents/content?documentId=${documentId}`
      );
      if (contentResponse.ok) {
        contentApiResult = await contentResponse.json();
      } else {
        contentApiResult = {
          error: `Content API failed: ${contentResponse.statusText}`,
        };
      }
    } catch (contentError: any) {
      contentApiResult = { error: contentError.message };
    }

    console.log("=== COMPREHENSIVE DOCUMENT DEBUG SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        storage_path: document.storage_path,
        created_at: document.created_at,
        updated_at: document.updated_at,
        error: document.error,
      },
      chunks: {
        count: chunks?.length || 0,
        error: chunksError?.message,
        preview:
          chunks?.slice(0, 2).map((c) => ({
            chunkNo: c.chunk_no,
            textPreview:
              c.text.substring(0, 100) + (c.text.length > 100 ? "..." : ""),
          })) || [],
      },
      storage: storageInfo,
      contentApi: contentApiResult,
      recommendations: [
        chunks?.length === 0
          ? "Document needs to be processed - run /api/process-document-manual"
          : null,
        !storageInfo?.accessible ? "File not accessible in storage" : null,
        document.status === "uploading" ? "Document still uploading" : null,
        document.status === "failed" ? "Document processing failed" : null,
        document.status === "processing"
          ? "Document is currently being processed"
          : null,
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("=== COMPREHENSIVE DOCUMENT DEBUG ERROR ===", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
