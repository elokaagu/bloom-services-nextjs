import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DATABASE SETUP CHECK START ===");

    const supabase = supabaseService();

    // Check if all required tables exist
    const tables = [
      "organizations",
      "workspaces",
      "users",
      "workspace_members",
      "documents",
      "document_chunks",
      "queries",
      "query_citations",
      "document_shares",
    ];

    const results: any = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("*").limit(1);

        if (error) {
          results[table] = { exists: false, error: error.message };
        } else {
          results[table] = { exists: true, count: data?.length || 0 };
        }
      } catch (e: any) {
        results[table] = { exists: false, error: e.message };
      }
    }

    // Check if vector extension is enabled
    let vectorEnabled = false;
    try {
      const { data, error } = await supabase.rpc("version");

      if (!error) {
        vectorEnabled = true;
      }
    } catch (e) {
      console.log("Vector extension check failed:", e);
    }

    // Check if RPC function exists
    let rpcFunctionExists = false;
    try {
      const { data, error } = await supabase.rpc("match_chunks", {
        p_workspace_id: "550e8400-e29b-41d4-a716-446655440001",
        p_query_embedding: new Array(1536).fill(0.1),
        p_match_count: 1,
      });

      if (!error) {
        rpcFunctionExists = true;
      }
    } catch (e) {
      console.log("RPC function check failed:", e);
    }

    console.log("=== DATABASE SETUP CHECK SUCCESS ===");

    return NextResponse.json({
      success: true,
      tables: results,
      vectorEnabled,
      rpcFunctionExists,
      recommendations: [
        !results.documents.exists && "Run the database schema migration",
        !results.document_chunks.exists && "Create document_chunks table",
        !vectorEnabled && "Enable pgvector extension",
        !rpcFunctionExists && "Create match_chunks RPC function",
      ].filter(Boolean),
    });
  } catch (e: any) {
    console.error("=== DATABASE SETUP CHECK ERROR ===", e);
    return NextResponse.json(
      {
        error: e.message,
        stack: e.stack,
      },
      { status: 500 }
    );
  }
}
