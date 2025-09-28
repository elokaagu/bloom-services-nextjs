import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG DOCUMENT PROCESSING ===");

    const supabase = supabaseService();

    // Get all documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "ready");

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }

    console.log("Found", documents?.length || 0, "documents");

    const debugResults = [];

    for (const doc of documents || []) {
      console.log(`Debugging document: ${doc.title}`);

      const debugInfo = {
        documentId: doc.id,
        title: doc.title,
        status: doc.status,
        storagePath: doc.storage_path,
        hasStoragePath: !!doc.storage_path,
        workspaceId: doc.workspace_id,
      };

      // Check if file exists in storage
      if (doc.storage_path) {
        try {
          const { data: fileData, error: fileError } = await supabase.storage
            .from("documents")
            .download(doc.storage_path);

          debugInfo.storageExists = !fileError;
          debugInfo.storageError = fileError?.message || null;
          debugInfo.fileSize = fileData
            ? (await fileData.arrayBuffer()).byteLength
            : 0;
        } catch (error: any) {
          debugInfo.storageExists = false;
          debugInfo.storageError = error.message;
        }
      } else {
        debugInfo.storageExists = false;
        debugInfo.storageError = "No storage path";
      }

      // Check if chunks exist
      const { data: chunks } = await supabase
        .from("document_chunks")
        .select("id")
        .eq("document_id", doc.id)
        .limit(1);

      debugInfo.hasChunks = chunks && chunks.length > 0;
      debugInfo.chunkCount = chunks?.length || 0;

      debugResults.push(debugInfo);
    }

    return NextResponse.json({
      success: true,
      documents: debugResults,
      environment: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        storageBucket: process.env.STORAGE_BUCKET,
      },
    });
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
