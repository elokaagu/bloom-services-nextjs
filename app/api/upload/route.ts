import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

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

    // Generate unique file path with safe naming
    const fileExt = file.name.split(".").pop();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Replace special chars with underscores
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}-${safeFileName}`;
    const filePath = fileName; // Upload to root of bucket

    console.log("Uploading file to storage:", filePath);

    // Upload file to Supabase Storage
    console.log("Attempting to upload file to storage...");
    console.log("Bucket:", process.env.STORAGE_BUCKET || "documents");
    console.log("Path:", filePath);
    console.log("File size:", file.size);
    console.log("File type:", file.type);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      console.error("Upload error details:", {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error,
      });

      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(
        (bucket) => bucket.name === (process.env.STORAGE_BUCKET || "documents")
      );

      return NextResponse.json(
        {
          error: `Storage upload failed: ${uploadError.message}`,
          details: {
            bucket: process.env.STORAGE_BUCKET || "documents",
            path: filePath,
            bucketExists,
            availableBuckets: buckets?.map((b) => b.name) || [],
          },
        },
        { status: 500 }
      );
    }

    console.log("File uploaded successfully:", uploadData.path);

    // Create document record in database
    const documentData = {
      title: title,
      workspace_id: workspaceId,
      owner_id: ownerId,
      storage_path: filePath, // This will be just the filename now
      status: "uploading", // Start with uploading status
      acl: "workspace",
    };

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert([documentData])
      .select()
      .single();

    if (docError) {
      console.error("Database insert error:", docError);
      // Clean up uploaded file
      await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .remove([filePath]);

      return NextResponse.json(
        { error: `Database error: ${docError.message}` },
        { status: 500 }
      );
    }

    console.log("Document created in database:", document.id);

    // Trigger document ingestion for RAG
    try {
      console.log("Starting document ingestion for RAG...");

      // Update status to processing
      await supabase
        .from("documents")
        .update({ status: "processing" })
        .eq("id", document.id);

      const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      if (ingestResponse.ok) {
        console.log("Document ingestion completed successfully");
        // Update status to ready
        await supabase
          .from("documents")
          .update({ status: "ready" })
          .eq("id", document.id);
      } else {
        console.error(
          "Document ingestion failed:",
          await ingestResponse.text()
        );
        // Update status to failed
        await supabase
          .from("documents")
          .update({ status: "failed" })
          .eq("id", document.id);
      }
    } catch (ingestError) {
      console.error("Error triggering document ingestion:", ingestError);
      // Update status to failed
      await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", document.id);
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
