import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    console.log("=== UPLOAD API START ===");
    
    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId = formData.get("workspaceId") as string;
    const ownerId = formData.get("ownerId") as string;
    const title = formData.get("title") as string;

    console.log("Form data:", {
      fileName: file?.name,
      fileSize: file?.size,
      workspaceId,
      ownerId,
      title,
    });

    if (!file) {
      console.error("No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate required fields
    if (!workspaceId || !ownerId) {
      console.error("Missing workspaceId or ownerId");
      return NextResponse.json(
        { error: "Missing workspaceId or ownerId" },
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

    console.log("Supabase client created");

    // Create document record
    const documentData = {
      title: title || file.name,
      workspace_id: workspaceId,
      owner_id: ownerId,
      storage_path: `documents/${file.name}`,
      status: "ready",
      acl: "workspace",
      error: null,
    };

    console.log("Inserting document:", documentData);

    const { data: document, error } = await supabase
      .from("documents")
      .insert([documentData])
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Document created successfully:", document.id);
    console.log("=== UPLOAD API SUCCESS ===");

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
