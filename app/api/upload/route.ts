import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    console.log("=== UPLOAD API START ===");
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized");

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId = formData.get("workspaceId") as string || "default-workspace";
    const ownerId = formData.get("ownerId") as string || "default-user";
    const title = formData.get("title") as string || file?.name;

    console.log("Form data parsed:", { 
      fileName: file?.name, 
      fileSize: file?.size, 
      workspaceId, 
      ownerId 
    });

    if (!file) {
      console.error("No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    console.log("Generated filename:", uniqueFileName);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(uniqueFileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    console.log("File uploaded to storage:", uploadData.path);

    // Create document record in database
    const { data: documentData, error: dbError } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspaceId,
        owner_id: ownerId,
        title: title,
        storage_path: uploadData.path,
        status: "ready"
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    console.log("Document record created:", documentData.id);
    console.log("=== UPLOAD API SUCCESS ===");

    return NextResponse.json({ 
      success: true, 
      document: documentData 
    });

  } catch (error) {
    console.error("=== UPLOAD API ERROR ===", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}