import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG CHAT DATABASE START ===");

    const supabase = supabaseService();
    const workspaceId = "550e8400-e29b-41d4-a716-446655440001";

    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from("documents")
      .select("id")
      .limit(1);

    if (testError) {
      return NextResponse.json({
        error: "Database connection failed",
        details: testError.message,
      });
    }

    // Get all documents
    const { data: allDocs, error: allDocsError } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (allDocsError) {
      return NextResponse.json({
        error: "Failed to fetch all documents",
        details: allDocsError.message,
      });
    }

    // Get documents for specific workspace
    const { data: workspaceDocs, error: workspaceDocsError } = await supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (workspaceDocsError) {
      return NextResponse.json({
        error: "Failed to fetch workspace documents",
        details: workspaceDocsError.message,
      });
    }

    // Get chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select(`
        id,
        document_id,
        text,
        documents!inner (
          id,
          title,
          workspace_id
        )
      `)
      .limit(10);

    if (chunksError) {
      return NextResponse.json({
        error: "Failed to fetch chunks",
        details: chunksError.message,
      });
    }

    console.log("=== DEBUG CHAT DATABASE SUCCESS ===");

    return NextResponse.json({
      success: true,
      workspaceId,
      databaseConnection: "OK",
      allDocuments: {
        count: allDocs?.length || 0,
        documents: allDocs?.map(d => ({
          id: d.id,
          title: d.title,
          workspace_id: d.workspace_id,
          status: d.status,
          created_at: d.created_at,
        })) || [],
      },
      workspaceDocuments: {
        count: workspaceDocs?.length || 0,
        documents: workspaceDocs?.map(d => ({
          id: d.id,
          title: d.title,
          workspace_id: d.workspace_id,
          status: d.status,
          created_at: d.created_at,
        })) || [],
      },
      chunks: {
        count: chunks?.length || 0,
        chunks: chunks?.map(c => ({
          id: c.id,
          document_id: c.document_id,
          document_title: c.documents?.title,
          document_workspace_id: c.documents?.workspace_id,
          text_preview: c.text?.substring(0, 100) + "...",
        })) || [],
      },
    });
  } catch (error: any) {
    console.error("=== DEBUG CHAT DATABASE ERROR ===", error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    });
  }
}
