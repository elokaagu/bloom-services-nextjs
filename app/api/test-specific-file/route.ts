import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== SPECIFIC FILE TEST API START ===");

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
    console.log("Storage path:", document.storage_path);

    const bucketName = process.env.STORAGE_BUCKET || "documents";
    const results = [];

    // Test the exact path from the database
    console.log(`Testing exact path: ${document.storage_path}`);
    const { data: fileData, error: fileError } = await supabase.storage
      .from(bucketName)
      .download(document.storage_path);

    results.push({
      bucket: bucketName,
      path: document.storage_path,
      success: !fileError && !!fileData,
      error: fileError?.message,
      fileSize: fileData ? (await fileData.arrayBuffer()).byteLength : 0,
    });

    // Test alternative paths
    const testPaths = [
      document.storage_path?.replace("documents/", ""),
      `documents/${document.storage_path}`,
      document.storage_path?.split("/").pop(),
    ].filter(Boolean);

    for (const testPath of testPaths) {
      console.log(`Testing alternative path: ${testPath}`);
      const { data: altFileData, error: altFileError } = await supabase.storage
        .from(bucketName)
        .download(testPath);

      results.push({
        bucket: bucketName,
        path: testPath,
        success: !altFileError && !!altFileData,
        error: altFileError?.message,
        fileSize: altFileData
          ? (await altFileData.arrayBuffer()).byteLength
          : 0,
      });
    }

    // List files in storage
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list("documents", { limit: 20 });

    console.log("=== SPECIFIC FILE TEST API SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        storagePath: document.storage_path,
      },
      bucket: bucketName,
      testResults: results,
      availableFiles:
        files?.map((f) => ({
          name: f.name,
          size: f.metadata?.size,
          lastModified: f.updated_at,
        })) || [],
      listError: listError?.message,
    });
  } catch (error: any) {
    console.error("=== SPECIFIC FILE TEST API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
