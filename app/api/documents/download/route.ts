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

    // Download file from storage
    console.log("Attempting to download from storage...");
    console.log("Bucket:", process.env.STORAGE_BUCKET);
    console.log("Path:", document.storage_path);

    let fileData = null;
    let fileError = null;

    // Try multiple approaches to get the file
    const buckets = [process.env.STORAGE_BUCKET, "documents"];
    const paths = [
      document.storage_path,
      document.storage_path?.replace("documents/", ""),
      `documents/${document.storage_path}`,
      // Handle case where storage_path already includes documents/
      document.storage_path?.startsWith("documents/")
        ? document.storage_path
        : `documents/${document.storage_path}`,
      // Try just the filename
      document.storage_path?.split("/").pop(),
    ].filter(Boolean); // Remove any undefined/null paths

    console.log("Will try these combinations:");
    buckets.forEach((bucket) => {
      paths.forEach((path) => {
        console.log(`  - Bucket: ${bucket}, Path: ${path}`);
      });
    });

    for (const bucket of buckets) {
      if (!bucket) continue;

      for (const path of paths) {
        if (!path) continue;

        console.log(`Trying bucket: ${bucket}, path: ${path}`);

        const { data, error } = await supabase.storage
          .from(bucket)
          .download(path);

        if (!error && data) {
          console.log(
            `Success! Found file in bucket: ${bucket}, path: ${path}`
          );
          fileData = data;
          break;
        } else {
          console.log(
            `Failed bucket: ${bucket}, path: ${path}, error:`,
            error?.message
          );
        }
      }

      if (fileData) break;
    }

    if (!fileData) {
      console.error("All download attempts failed");

      // List files in storage to help debug
      const { data: files, error: listError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .list("documents", { limit: 10 });

      console.log("Files in storage:", files);
      console.log("List error:", listError);

      return NextResponse.json(
        {
          error: "Failed to download file from storage",
          details: "File not found in any expected location",
          storagePath: document.storage_path,
          bucket: process.env.STORAGE_BUCKET,
          availableFiles: files?.map((f) => f.name) || [],
          listError: listError?.message,
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
    // Ensure filename is properly encoded for download
    const encodedFilename = encodeURIComponent(document.title);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": buffer.length.toString(),
        // Also provide a simpler filename for older browsers
        "Content-Disposition-Fallback": `attachment; filename="${document.title.replace(
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
