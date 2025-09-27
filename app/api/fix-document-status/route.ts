import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== FIX DOCUMENT STATUS START ===");

    const supabase = supabaseService();

    // Get the most recent failed document
    const { data: failedDocs, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error fetching failed documents:", fetchError);
      return NextResponse.json(
        { error: "Database error", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!failedDocs || failedDocs.length === 0) {
      return NextResponse.json(
        { message: "No failed documents found" },
        { status: 404 }
      );
    }

    const document = failedDocs[0];
    console.log(`Fixing document: ${document.title} (${document.id})`);

    // Check if file exists in storage
    console.log("Checking if file exists in storage...");
    const { data: fileData, error: fileError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .download(document.storage_path);

    if (fileError) {
      console.error("File not found in storage:", fileError);
      return NextResponse.json(
        { 
          error: "File not found in storage", 
          details: fileError.message,
          storagePath: document.storage_path,
          bucket: process.env.STORAGE_BUCKET || "documents"
        },
        { status: 404 }
      );
    }

    console.log("File found in storage, size:", fileData.size);

    // Since the file exists in storage, let's mark it as ready
    // This bypasses the ingestion process for now
    const { error: updateError } = await supabase
      .from("documents")
      .update({ 
        status: "ready",
        error: null 
      })
      .eq("id", document.id);

    if (updateError) {
      console.error("Error updating document status:", updateError);
      return NextResponse.json(
        { error: "Database update error", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("Document status updated to ready");

    return NextResponse.json({
      success: true,
      message: "Document status fixed - marked as ready",
      document: {
        id: document.id,
        title: document.title,
        status: "ready",
        storagePath: document.storage_path,
        fileSize: fileData.size,
      },
    });

  } catch (error) {
    console.error("=== FIX DOCUMENT STATUS ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
