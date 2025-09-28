import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { createChunksForDocument } from "@/lib/chunk-creation";

export async function POST(req: NextRequest) {
  try {
    console.log("=== UPLOAD API START (REAL STORAGE) ===");

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId =
      (formData.get("workspaceId") as string) ||
      "550e8400-e29b-41d4-a716-446655440001";
    const ownerId =
      (formData.get("ownerId") as string) ||
      "550e8400-e29b-41d4-a716-446655440002";
    const title = (formData.get("title") as string) || file?.name;

    console.log("Form data parsed:", {
      fileName: file?.name,
      fileSize: file?.size,
      workspaceId,
      ownerId,
    });

    if (!file) {
      console.error("No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (limit to 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      console.error("File too large:", file.size, "bytes");
      return NextResponse.json(
        {
          error: "File too large. Maximum size is 100MB.",
          fileSize: file.size,
          maxSize: maxSize,
        },
        { status: 413 }
      );
    }

    // Validate environment variables
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

    // Use centralized Supabase client
    const supabase = supabaseService();
    console.log("Supabase client initialized");

    // Generate clean file path with readable naming convention
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const cleanBaseName = baseName
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_"); // Clean name
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, ""); // YYYYMMDDTHHMMSS
    const fileName = `${timestamp}_${cleanBaseName}.${fileExt}`;
    const filePath = fileName; // Upload to root of bucket

    console.log("Uploading file to storage:", filePath);

    // Upload file to Supabase Storage
    console.log("Attempting to upload file to storage...");
    console.log("Bucket:", process.env.STORAGE_BUCKET || "documents");
    console.log("Path:", filePath);
    console.log("File size:", file.size);
    console.log("File type:", file.type);

    console.log("About to call supabase.storage.upload...");
    console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
    console.log("STORAGE_BUCKET:", process.env.STORAGE_BUCKET);
    console.log(
      "File will be uploaded to:",
      `${process.env.SUPABASE_URL}/storage/v1/object/${process.env.STORAGE_BUCKET}/${filePath}`
    );

    let uploadResult;
    try {
      uploadResult = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      console.log("Upload result:", uploadResult);
    } catch (uploadException: any) {
      console.error("Upload exception:", uploadException);
      return NextResponse.json(
        {
          error: "Upload failed with exception",
          details: uploadException.message,
          fileSize: file.size,
          fileName: file.name,
        },
        { status: 500 }
      );
    }

    const { data: uploadData, error: uploadError } = uploadResult;

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        {
          error: "Upload failed",
          details: uploadError.message,
          fileSize: file.size,
          fileName: file.name,
        },
        { status: 500 }
      );
    }

    console.log("File uploaded successfully:", uploadData.path);

    // Verify file exists in storage
    console.log("Verifying file exists in storage...");
    const { data: verifyData, error: verifyError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .download(filePath);

    if (verifyError || !verifyData) {
      console.error("File verification failed:", verifyError);
      return NextResponse.json(
        {
          error: "File upload verification failed",
          details: verifyError?.message,
        },
        { status: 500 }
      );
    }

    console.log("File verification successful, file size:", verifyData.size);
    console.log("✅ FILE SUCCESSFULLY UPLOADED TO SUPABASE STORAGE");

    // Generate public URL
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.STORAGE_BUCKET}/${filePath}`;
    console.log("Storage URL:", publicUrl);

    // Create document record in database
    console.log("Creating document record in database...");
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        title: title,
        storage_path: filePath,
        storage_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        workspace_id: workspaceId,
        owner: ownerId,
        status: "uploaded",
        acl: "private",
      })
      .select()
      .single();

    if (docError) {
      console.error("Database insert error:", docError);
      return NextResponse.json(
        { error: `Database error: ${docError.message}` },
        { status: 500 }
      );
    }

    console.log("Document created in database:", document.id);

    // Automatically create chunks for RAG using direct function call
    try {
      console.log("Starting automatic chunk creation for RAG...");
      console.log("Calling direct chunk creation for document:", document.id);
      
      const chunkResult = await createChunksForDocument(document.id);
      console.log("Automatic chunk creation completed:", chunkResult);

      if (chunkResult.success && chunkResult.chunksCreated > 0) {
        console.log(
          `✅ Document ready with ${chunkResult.chunksCreated} chunks`
        );
      } else {
        console.log("⚠️ Document ready but no chunks created");
        console.error("Chunk creation failed:", chunkResult);
      }
    } catch (chunkError) {
      console.error("Error triggering automatic chunk creation:", chunkError);

      // Check if file exists in storage
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .download(document.storage_path);

        if (!fileError && fileData) {
          console.log(
            "File exists in storage, marking as ready despite chunk creation error"
          );
          await supabase
            .from("documents")
            .update({
              status: "ready",
              error: `Chunk creation error: ${
                chunkError instanceof Error
                  ? chunkError.message
                  : "Unknown error"
              } - but file accessible`,
            })
            .eq("id", document.id);
        } else {
          console.log("File not found in storage, marking as failed");
          await supabase
            .from("documents")
            .update({ status: "failed", error: chunkError.message })
            .eq("id", document.id);
        }
      } catch (storageError) {
        console.error("Error checking file in storage:", storageError);
        await supabase
          .from("documents")
          .update({ status: "failed", error: chunkError.message })
          .eq("id", document.id);
      }
    }

    console.log("=== UPLOAD API SUCCESS (REAL STORAGE) ===");

    return NextResponse.json({
      success: true,
      document: document,
    });
  } catch (error) {
    console.error("=== UPLOAD API ERROR ===", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}