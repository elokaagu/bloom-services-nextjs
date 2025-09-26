import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    console.log("=== UPLOAD API START (REAL STORAGE) ===");

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId =
      (formData.get("workspaceId") as string) || "550e8400-e29b-41d4-a716-446655440001";
    const ownerId = (formData.get("ownerId") as string) || "550e8400-e29b-41d4-a716-446655440002";
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

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error - missing Supabase credentials" },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    console.log("Supabase client initialized");

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    console.log("Uploading file to storage:", filePath);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log("File uploaded successfully:", uploadData.path);

    // Create document record in database
    const documentData = {
      title: title,
      workspace_id: workspaceId,
      owner_id: ownerId,
      storage_path: filePath,
      status: "ready",
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
      const ingestResponse = await fetch(
        `${req.nextUrl.origin}/api/ingest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: document.id }),
        }
      );

      if (ingestResponse.ok) {
        console.log("Document ingestion completed successfully");
      } else {
        console.error("Document ingestion failed:", await ingestResponse.text());
      }
    } catch (ingestError) {
      console.error("Error triggering document ingestion:", ingestError);
      // Don't fail the upload if ingestion fails
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