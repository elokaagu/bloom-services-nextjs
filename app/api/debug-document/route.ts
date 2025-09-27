import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DOCUMENT DEBUG API START ===");

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId") || "36695968-051a-419d-9fb2-d58aa260ee62";

    const supabase = supabaseService();

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({
        success: false,
        error: "Document not found",
        documentId,
      });
    }

    console.log("Document found:", document.title);
    console.log("Storage path:", document.storage_path);
    console.log("Status:", document.status);

    // Check if chunks exist
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no, text")
      .eq("document_id", documentId)
      .order("chunk_no");

    console.log("Chunks found:", chunks?.length || 0);

    // Try to access storage
    let storageTest = {
      success: false,
      error: null,
      path: document.storage_path,
      correctedPath: null,
    };

    try {
      // Try different path variations
      const paths = [
        document.storage_path,
        document.storage_path?.replace(/^documents\//, ""),
        `documents/${document.storage_path}`,
        document.title, // Just the filename
      ].filter(Boolean);

      console.log("Testing paths:", paths);

      for (const path of paths) {
        console.log(`Testing path: ${path}`);
        
        const { data: fileData, error: fileError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .download(path);

        if (!fileError && fileData) {
          console.log(`SUCCESS! Found file at path: ${path}`);
          storageTest = {
            success: true,
            error: null,
            path: document.storage_path,
            correctedPath: path,
            fileSize: (await fileData.arrayBuffer()).byteLength,
          };
          break;
        } else {
          console.log(`Failed path: ${path}, error:`, fileError?.message);
        }
      }

      if (!storageTest.success) {
        // List files in storage to see what's actually there
        const { data: files, error: listError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .list("", { limit: 20 });

        console.log("Files in storage:", files);
        storageTest.error = "File not found in any expected location";
        storageTest.availableFiles = files?.map(f => f.name) || [];
        storageTest.listError = listError?.message;
      }
    } catch (storageError: any) {
      console.error("Storage test error:", storageError);
      storageTest.error = storageError.message;
    }

    console.log("=== DOCUMENT DEBUG API SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        storagePath: document.storage_path,
        createdAt: document.created_at,
      },
      chunks: {
        count: chunks?.length || 0,
        error: chunksError?.message,
        preview: chunks?.slice(0, 2).map(c => ({
          chunkNo: c.chunk_no,
          textPreview: c.text.substring(0, 100) + "...",
        })) || [],
      },
      storageTest,
    });
  } catch (error: any) {
    console.error("=== DOCUMENT DEBUG API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}