import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DOCUMENT DEBUG API START ===");

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

    // Check storage bucket
    const bucketName = process.env.STORAGE_BUCKET || "documents";
    console.log("Storage bucket:", bucketName);

    // List files in storage to see what's available
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list("documents", {
        limit: 10,
        offset: 0,
      });

    console.log("Files in storage:", files);
    console.log("List error:", listError);

    // Try to get file info if storage_path exists
    let fileInfo = null;
    if (document.storage_path) {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from(bucketName)
          .download(document.storage_path);

        if (fileError) {
          fileInfo = {
            error: fileError.message,
            statusCode: fileError.statusCode,
            errorType: fileError.error,
          };
        } else if (fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          fileInfo = {
            success: true,
            size: buffer.length,
            type: fileData.type,
          };
        }
      } catch (error: any) {
        fileInfo = {
          error: error.message,
          stack: error.stack,
        };
      }
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
        updatedAt: document.updated_at,
      },
      storage: {
        bucket: bucketName,
        filesInStorage: files?.length || 0,
        listError: listError?.message,
        fileInfo,
      },
      environment: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasStorageBucket: !!process.env.STORAGE_BUCKET,
        storageBucket: process.env.STORAGE_BUCKET,
      },
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
