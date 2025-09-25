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

    // Delete document (this will cascade delete chunks due to foreign key)
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

    console.log("Document deleted successfully:", documentId);
    console.log("=== DELETE DOCUMENT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
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
