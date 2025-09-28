import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== RAG SYSTEM STATUS CHECK ===");
    
    const supabase = supabaseService();
    
    // Check documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status, workspace_id")
      .limit(10);
    
    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }
    
    console.log("Documents found:", documents?.length || 0);
    
    // Check chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, document_id, text")
      .limit(10);
    
    if (chunksError) {
      console.error("Error fetching chunks:", chunksError);
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }
    
    console.log("Chunks found:", chunks?.length || 0);
    
    // Check if pgvector extension is working
    const { data: vectorTest, error: vectorError } = await supabase
      .rpc('match_chunks', {
        p_workspace_id: documents?.[0]?.workspace_id || '00000000-0000-0000-0000-000000000000',
        p_query_embedding: new Array(1536).fill(0.1), // Dummy embedding
        p_match_count: 1
      });
    
    if (vectorError) {
      console.error("Vector search test failed:", vectorError);
    } else {
      console.log("Vector search test passed");
    }
    
    return NextResponse.json({
      success: true,
      documents: {
        count: documents?.length || 0,
        list: documents?.map(d => ({
          id: d.id,
          title: d.title,
          status: d.status,
          workspace_id: d.workspace_id
        })) || []
      },
      chunks: {
        count: chunks?.length || 0,
        sample: chunks?.slice(0, 3).map(c => ({
          id: c.id,
          document_id: c.document_id,
          text_preview: c.text.substring(0, 100) + "..."
        })) || []
      },
      vectorSearch: {
        working: !vectorError,
        error: vectorError?.message || null
      }
    });
    
  } catch (error: any) {
    console.error("RAG status check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
