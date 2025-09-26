import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== PGVECTOR CHECK START ===");
    
    const supabase = supabaseService();
    
    // Check if pgvector extension is enabled
    let vectorEnabled = false;
    let vectorError = null;
    
    try {
      const { data, error } = await supabase
        .from("pg_extension")
        .select("extname")
        .eq("extname", "vector")
        .single();
      
      if (!error && data) {
        vectorEnabled = true;
      } else {
        vectorError = error?.message || "Vector extension not found";
      }
    } catch (e: any) {
      vectorError = e.message;
    }

    // Check if we can create a vector column (test)
    let canCreateVector = false;
    let vectorTestError = null;
    
    try {
      // Try to create a test table with vector column
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TEMP TABLE test_vector (
            id SERIAL PRIMARY KEY,
            embedding vector(1536)
          );
          DROP TABLE test_vector;
        `
      });
      
      if (!createError) {
        canCreateVector = true;
      } else {
        vectorTestError = createError.message;
      }
    } catch (e: any) {
      vectorTestError = e.message;
    }

    // Check document_chunks table structure
    let chunksTableInfo = null;
    try {
      const { data, error } = await supabase
        .from("information_schema.columns")
        .select("column_name, data_type, udt_name")
        .eq("table_name", "document_chunks")
        .eq("column_name", "embedding");
      
      if (!error && data && data.length > 0) {
        chunksTableInfo = data[0];
      }
    } catch (e: any) {
      console.log("Could not check chunks table structure:", e.message);
    }

    console.log("=== PGVECTOR CHECK SUCCESS ===");

    return NextResponse.json({
      success: true,
      vectorEnabled,
      canCreateVector,
      vectorError,
      vectorTestError,
      chunksTableInfo,
      instructions: {
        enableVector: !vectorEnabled ? [
          "1. Go to your Supabase dashboard",
          "2. Navigate to SQL Editor",
          "3. Run: CREATE EXTENSION IF NOT EXISTS vector;",
          "4. Verify with: SELECT * FROM pg_extension WHERE extname = 'vector';"
        ] : [],
        fixChunksTable: chunksTableInfo?.udt_name !== 'vector' ? [
          "1. Go to Supabase SQL Editor",
          "2. Run: ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1536);",
          "3. Or recreate the table with proper vector type"
        ] : []
      }
    });

  } catch (e: any) {
    console.error("=== PGVECTOR CHECK ERROR ===", e);
    return NextResponse.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
