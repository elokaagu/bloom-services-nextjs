import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    console.log("=== FETCH DOCUMENTS API START ===");

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized");

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "default-workspace";
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    console.log("Query parameters:", { workspaceId, status, search });

    // Build query
    let query = supabase
      .from("documents")
      .select(
        `
        id,
        title,
        status,
        created_at,
        updated_at,
        workspace_id,
        owner_id,
        storage_path,
        error
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
    console.log("=== FETCH DOCUMENTS API SUCCESS ===");

    return NextResponse.json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0,
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
