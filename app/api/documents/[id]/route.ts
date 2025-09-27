import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== DELETE DOCUMENT API START ===");
    
    const documentId = params.id;
    
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    console.log("Deleting document:", documentId);

    // First, get the document to find the storage path
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("storage_path, title")
      .eq("id", documentId)
      .single();

    if (fetchError) {
      console.error("Error fetching document:", fetchError);
      return NextResponse.json(
        { error: `Document not found: ${fetchError.message}` },
        { status: 404 }
      );
    }

    console.log("Document found:", document.title, "Storage path:", document.storage_path);

    // Delete from Supabase storage first
    if (document.storage_path) {
      console.log("Deleting file from storage:", document.storage_path);
      const { error: storageError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .remove([document.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue with database deletion even if storage deletion fails
        console.log("Continuing with database deletion despite storage error");
      } else {
        console.log("File deleted from storage successfully");
      }
    }

    // Delete document from database (this will cascade delete chunks due to foreign key)
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (error) {
      console.error("Database delete error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Document deleted successfully from database:", documentId);
    console.log("=== DELETE DOCUMENT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully from both storage and database",
      document: {
        id: documentId,
        title: document.title,
        storagePath: document.storage_path,
      },
    });

  } catch (error) {
    console.error("=== DELETE DOCUMENT API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== UPDATE DOCUMENT API START ===");
    
    const documentId = params.id;
    const body = await req.json();
    const { updates } = body;
    
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    console.log("Updating document:", documentId, "with:", updates);

    // Update document
    const { data: document, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", documentId)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Document updated successfully:", document.id);
    console.log("=== UPDATE DOCUMENT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: document,
    });

  } catch (error) {
    console.error("=== UPDATE DOCUMENT API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
