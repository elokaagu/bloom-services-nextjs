import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DATABASE VALIDATION START ===");

    const supabase = supabaseService();

    const validationResults = {
      environment: {
        supabaseUrl: !!process.env.SUPABASE_URL,
        supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        openaiApiKey: !!process.env.OPENAI_API_KEY,
        embeddingModel: !!process.env.EMBEDDING_MODEL,
        storageBucket: !!process.env.STORAGE_BUCKET,
        vectorDim: !!process.env.VECTOR_DIM,
      },
      database: {
        connection: false,
        tables: {
          documents: false,
          document_chunks: false,
          queries: false,
          workspaces: false,
          users: false,
        },
        extensions: {
          pgvector: false,
        },
        functions: {
          match_chunks: false,
        },
        storage: {
          bucketExists: false,
          bucketAccessible: false,
        },
      },
      errors: [] as string[],
    };

    // Test database connection
    try {
      const { data: testData, error: testError } = await supabase
        .from("documents")
        .select("id")
        .limit(1);

      if (testError) {
        validationResults.errors.push(
          `Database connection failed: ${testError.message}`
        );
      } else {
        validationResults.database.connection = true;
        console.log("Database connection successful");
      }
    } catch (error: any) {
      validationResults.errors.push(
        `Database connection error: ${error.message}`
      );
    }

    // Check if tables exist
    const tables = [
      "documents",
      "document_chunks",
      "queries",
      "workspaces",
      "users",
    ];
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select("id").limit(1);

        if (error) {
          validationResults.errors.push(
            `Table '${table}' not accessible: ${error.message}`
          );
        } else {
          validationResults.database.tables[
            table as keyof typeof validationResults.database.tables
          ] = true;
          console.log(`Table '${table}' exists and accessible`);
        }
      } catch (error: any) {
        validationResults.errors.push(
          `Error checking table '${table}': ${error.message}`
        );
      }
    }

    // Check pgvector extension
    try {
      const { data, error } = await supabase.rpc("check_pgvector");
      if (error) {
        validationResults.errors.push(
          `pgvector extension check failed: ${error.message}`
        );
      } else {
        validationResults.database.extensions.pgvector = true;
        console.log("pgvector extension is available");
      }
    } catch (error: any) {
      validationResults.errors.push(
        `pgvector extension error: ${error.message}`
      );
    }

    // Check match_chunks function
    try {
      const { data, error } = await supabase.rpc("match_chunks", {
        p_workspace_id: "550e8400-e29b-41d4-a716-446655440001",
        p_query_embedding: new Array(1536).fill(0),
        p_match_count: 1,
      });

      if (error) {
        validationResults.errors.push(
          `match_chunks function failed: ${error.message}`
        );
      } else {
        validationResults.database.functions.match_chunks = true;
        console.log("match_chunks function is available");
      }
    } catch (error: any) {
      validationResults.errors.push(
        `match_chunks function error: ${error.message}`
      );
    }

    // Check storage bucket
    try {
      const { data, error } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .list("", { limit: 1 });

      if (error) {
        validationResults.errors.push(
          `Storage bucket access failed: ${error.message}`
        );
      } else {
        validationResults.database.storage.bucketExists = true;
        validationResults.database.storage.bucketAccessible = true;
        console.log("Storage bucket is accessible");
      }
    } catch (error: any) {
      validationResults.errors.push(`Storage bucket error: ${error.message}`);
    }

    // Check document and chunk counts
    let documentCount = 0;
    let chunkCount = 0;

    try {
      const { count: docCount } = await supabase
        .from("documents")
        .select("id", { count: "exact" });
      documentCount = docCount || 0;
    } catch (error: any) {
      validationResults.errors.push(
        `Error counting documents: ${error.message}`
      );
    }

    try {
      const { count: chkCount } = await supabase
        .from("document_chunks")
        .select("id", { count: "exact" });
      chunkCount = chkCount || 0;
    } catch (error: any) {
      validationResults.errors.push(`Error counting chunks: ${error.message}`);
    }

    console.log("=== DATABASE VALIDATION SUCCESS ===");

    return NextResponse.json({
      success: true,
      validation: validationResults,
      counts: {
        documents: documentCount,
        chunks: chunkCount,
      },
      recommendations: [
        !validationResults.environment.supabaseUrl &&
          "Set SUPABASE_URL environment variable",
        !validationResults.environment.supabaseServiceKey &&
          "Set SUPABASE_SERVICE_ROLE_KEY environment variable",
        !validationResults.environment.openaiApiKey &&
          "Set OPENAI_API_KEY environment variable",
        !validationResults.environment.embeddingModel &&
          "Set EMBEDDING_MODEL environment variable",
        !validationResults.environment.storageBucket &&
          "Set STORAGE_BUCKET environment variable",
        !validationResults.database.connection &&
          "Check database connection and credentials",
        !validationResults.database.extensions.pgvector &&
          "Enable pgvector extension in database",
        !validationResults.database.functions.match_chunks &&
          "Create match_chunks RPC function",
        !validationResults.database.storage.bucketAccessible &&
          "Check storage bucket configuration",
        documentCount === 0 && "No documents found - upload some documents",
        chunkCount === 0 && "No document chunks found - process documents",
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("=== DATABASE VALIDATION ERROR ===", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
