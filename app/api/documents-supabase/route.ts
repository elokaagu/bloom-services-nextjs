import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    console.log("=== FETCH DOCUMENTS API START (SUPABASE) ===");

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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "default-workspace";
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    console.log("Query parameters:", { workspaceId, status, search });

    // Build query with user join
    let query = supabase
      .from("documents")
      .select(
        `
        id,
        title,
        created_at,
        updated_at,
        status,
        acl,
        owner_id,
        storage_path,
        error,
        summary,
        summary_updated_at,
        users!documents_owner_id_fkey (
          name,
          email
        )
      `
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    // Add status filter if provided
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Add search filter if provided
    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`Found ${documents?.length || 0} documents`);

    // Get file sizes from storage for each document
    const documentsWithSizes = await Promise.all(
      (documents || []).map(async (doc) => {
        try {
          // Get file metadata from storage
          const { data: fileData } = await supabase.storage
            .from(process.env.STORAGE_BUCKET || "documents")
            .list("", {
              search: doc.storage_path.split("/").pop(),
            });

          const fileSize = fileData?.[0]?.metadata?.size;
          const formattedSize = fileSize
            ? `${(fileSize / 1024 / 1024).toFixed(1)} MB`
            : "Size not available";

          return {
            ...doc,
            fileSize: formattedSize,
          };
        } catch (error) {
          console.error(`Error getting size for ${doc.title}:`, error);
          return {
            ...doc,
            fileSize: "Size not available",
          };
        }
      })
    );

    console.log("=== FETCH DOCUMENTS API SUCCESS (SUPABASE) ===");

    return NextResponse.json({
      success: true,
      documents: documentsWithSizes,
      count: documentsWithSizes.length,
    });
  } catch (error) {
    console.error("=== FETCH DOCUMENTS API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== ADD DOCUMENT API START (SUPABASE) ===");

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

    const body = await req.json();
    const {
      title,
      workspaceId,
      ownerId,
      status = "ready",
      acl = "workspace",
    } = body;

    const newDocument = {
      title,
      workspace_id: workspaceId || "550e8400-e29b-41d4-a716-446655440001", // Policy Research workspace UUID
      owner_id: ownerId || "550e8400-e29b-41d4-a716-446655440002", // John Doe user UUID
      storage_path: `documents/${title}`,
      status,
      acl,
      error: null,
    };

    const { data: document, error } = await supabase
      .from("documents")
      .insert([newDocument])
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Document added:", document.id);
    console.log("=== ADD DOCUMENT API SUCCESS (SUPABASE) ===");

    return NextResponse.json({
      success: true,
      document: document,
    });
  } catch (error) {
    console.error("=== ADD DOCUMENT API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
