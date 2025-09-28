import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DOCUMENT DOWNLOAD API START ===");

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    console.log("Document ID:", documentId);

    if (!documentId) {
      console.error("No document ID provided");
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error - missing Supabase credentials" },
        { status: 500 }
      );
    }

    if (!process.env.STORAGE_BUCKET) {
      console.error("Missing STORAGE_BUCKET environment variable");
      return NextResponse.json(
        { error: "Server configuration error - missing storage bucket" },
        { status: 500 }
      );
    }

    console.log("Environment variables check passed");
    console.log("Storage bucket:", process.env.STORAGE_BUCKET);

    const supabase = supabaseService();

    // Get document details
    console.log("Fetching document from database...");
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError) {
      console.error("Database error:", docError);
      return NextResponse.json(
        { error: `Database error: ${docError.message}` },
        { status: 500 }
      );
    }

    if (!document) {
      console.error("Document not found in database");
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    console.log("Document found:", document.title);
    console.log("Document status:", document.status);
    console.log("Storage path:", document.storage_path);

    if (!document.storage_path) {
      console.error("No storage path for document");
      return NextResponse.json(
        { error: "Document file not available for download" },
        { status: 404 }
      );
    }

    // Download file from storage - Focus on documents bucket
    console.log("=== DOWNLOADING FROM SUPABASE STORAGE ===");
    console.log("Document storage_path:", document.storage_path);
    console.log("Environment STORAGE_BUCKET:", process.env.STORAGE_BUCKET);

    let fileData = null;
    let fileError = null;

    // First, let's list files in the documents bucket to see what's available
    console.log("Listing files in documents bucket...");
    const { data: fileList, error: listError } = await supabase.storage
      .from("documents")
      .list("", { limit: 50 });

    if (listError) {
      console.error("Error listing files:", listError);
    } else {
      console.log(
        "Files found in documents bucket:",
        fileList?.map((f) => f.name) || []
      );
    }

    // Try to download the file - prioritize documents bucket
    const downloadPaths = [
      document.storage_path, // Original path
      document.storage_path?.replace("documents/", ""), // Remove documents/ prefix if present
      `documents/${document.storage_path}`, // Add documents/ prefix if not present
    ].filter(Boolean);

    console.log("Will try these download paths:");
    downloadPaths.forEach((path, index) => {
      console.log(`  ${index + 1}. Path: "${path}"`);
    });

    // Try downloading from documents bucket first
    for (const path of downloadPaths) {
      if (!path) continue;

      console.log(`Attempting download from documents bucket, path: "${path}"`);

      const { data, error } = await supabase.storage
        .from("documents")
        .download(path);

      if (!error && data) {
        console.log(
          `✅ SUCCESS! Downloaded file from documents bucket, path: "${path}"`
        );
        console.log("File size:", data.size, "bytes");
        fileData = data;
        break;
      } else {
        console.log(
          `❌ Failed to download from documents bucket, path: "${path}"`
        );
        console.log("Error:", error?.message);
      }
    }

    // If documents bucket failed, try the environment bucket as fallback
    if (
      !fileData &&
      process.env.STORAGE_BUCKET &&
      process.env.STORAGE_BUCKET !== "documents"
    ) {
      console.log(`Trying fallback bucket: ${process.env.STORAGE_BUCKET}`);

      for (const path of downloadPaths) {
        if (!path) continue;

        console.log(
          `Attempting download from ${process.env.STORAGE_BUCKET} bucket, path: "${path}"`
        );

        const { data, error } = await supabase.storage
          .from(process.env.STORAGE_BUCKET)
          .download(path);

        if (!error && data) {
          console.log(
            `✅ SUCCESS! Downloaded file from ${process.env.STORAGE_BUCKET} bucket, path: "${path}"`
          );
          fileData = data;
          break;
        } else {
          console.log(
            `❌ Failed to download from ${process.env.STORAGE_BUCKET} bucket, path: "${path}"`
          );
          console.log("Error:", error?.message);
        }
      }
    }

    if (!fileData) {
      console.error("=== ALL DOWNLOAD ATTEMPTS FAILED ===");
      console.error("Document storage_path:", document.storage_path);
      console.error("Environment STORAGE_BUCKET:", process.env.STORAGE_BUCKET);

      return NextResponse.json(
        {
          error: "Failed to download file from Supabase storage",
          details: "File not found in any expected location",
          storagePath: document.storage_path,
          bucket: process.env.STORAGE_BUCKET,
          availableFiles: fileList?.map((f) => f.name) || [],
          listError: listError?.message,
          debugInfo: {
            documentId: documentId,
            documentTitle: document.title,
            storagePath: document.storage_path,
            environmentBucket: process.env.STORAGE_BUCKET,
            triedPaths: downloadPaths,
          },
        },
        { status: 404 }
      );
    }

    console.log("File data received, converting to buffer...");

    // Convert to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    console.log("File downloaded successfully, size:", buffer.length);
    console.log("=== DOCUMENT DOWNLOAD API SUCCESS ===");

    // Return file with proper headers
    // Use the original filename from storage_path if available, otherwise use title
    let filename = document.title;
    
    // Try to extract filename from storage_path
    if (document.storage_path) {
      const pathParts = document.storage_path.split('/');
      const originalFilename = pathParts[pathParts.length - 1];
      if (originalFilename && originalFilename.includes('.')) {
        filename = originalFilename;
      }
    }
    
    // Ensure filename has proper extension based on file_type
    if (document.file_type && !filename.includes('.')) {
      const extension = document.file_type.split('/')[1];
      if (extension) {
        filename = `${filename}.${extension}`;
      }
    }
    
    console.log("Using filename for download:", filename);
    
    // Ensure filename is properly encoded for download
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": document.file_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": buffer.length.toString(),
        // Also provide a simpler filename for older browsers
        "Content-Disposition-Fallback": `attachment; filename="${filename.replace(
          /[^a-zA-Z0-9.-]/g,
          "_"
        )}"`,
      },
    });
  } catch (error: any) {
    console.error("=== DOCUMENT DOWNLOAD API ERROR ===", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
