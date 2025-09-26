import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG NATIONAL PROCUREMENT DOCUMENT ===");
    
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
    console.log("Found document:", document.title);
    console.log("Document ID:", document.id);
    console.log("Status:", document.status);
    console.log("Storage path:", document.storage_path);

    // Check for chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no, text")
      .eq("document_id", document.id)
      .order("chunk_no");

    console.log("Chunks found:", chunks?.length || 0);

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

    // Test the document content API
    let contentApiResult = null;
    try {
      const contentResponse = await fetch(`${req.nextUrl.origin}/api/documents/content?documentId=${document.id}`);
      if (contentResponse.ok) {
        contentApiResult = await contentResponse.json();
      } else {
        contentApiResult = { error: `Content API failed: ${contentResponse.statusText}` };
      }
    } catch (contentError: any) {
      contentApiResult = { error: contentError.message };
    }

    console.log("=== DEBUG COMPLETE ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        storage_path: document.storage_path,
        created_at: document.created_at,
        summary: document.summary,
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
      contentApi: contentApiResult,
      recommendations: [
        chunks?.length === 0 ? "Document needs to be processed - run /api/process-document-simple" : null,
        !storageInfo?.hasFile ? "File not found in storage" : null,
        document.status === "uploading" ? "Document still uploading" : null,
        document.status === "failed" ? "Document processing failed" : null,
        document.status === "processing" ? "Document is currently being processed" : null,
      ].filter(Boolean),
    });

  } catch (error) {
    console.error("=== DEBUG ERROR ===", error);
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
