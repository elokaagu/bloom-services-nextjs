import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG CHAT API START ===");
    
    const supabase = supabaseService();
    console.log("Supabase client created");

    // Test basic database connection
    const { data: testData, error: testError } = await supabase
      .from("documents")
      .select("id, title")
      .limit(1);

    if (testError) {
      console.error("Database connection error:", testError);
      return NextResponse.json({ 
        error: "Database connection failed", 
        details: testError.message 
      }, { status: 500 });
    }

    console.log("Database connection successful, found documents:", testData?.length || 0);

    // Test if document_chunks table exists
    const { data: chunksData, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id")
      .limit(1);

    if (chunksError) {
      console.error("Document chunks table error:", chunksError);
      return NextResponse.json({ 
        error: "Document chunks table issue", 
        details: chunksError.message 
      }, { status: 500 });
    }

    console.log("Document chunks table accessible, found chunks:", chunksData?.length || 0);

    // Test if RPC function exists
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "match_chunks",
        {
          p_workspace_id: "550e8400-e29b-41d4-a716-446655440001",
          p_query_embedding: new Array(1536).fill(0.1), // Dummy embedding
          p_match_count: 1,
        }
      );

      if (rpcError) {
        console.log("RPC function error (expected):", rpcError.message);
      } else {
        console.log("RPC function works, found chunks:", rpcData?.length || 0);
      }
    } catch (rpcTestError) {
      console.log("RPC function test error:", rpcTestError);
    }

    console.log("=== DEBUG CHAT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      databaseConnected: true,
      documentsFound: testData?.length || 0,
      chunksFound: chunksData?.length || 0,
      environment: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        embeddingModel: process.env.EMBEDDING_MODEL,
        generationModel: process.env.GENERATION_MODEL,
      }
    });

  } catch (e: any) {
    console.error("=== DEBUG CHAT API ERROR ===", e);
    return NextResponse.json({ 
      error: e.message,
      stack: e.stack 
    }, { status: 500 });
  }
}
