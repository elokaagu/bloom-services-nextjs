import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== UPLOAD DEBUG API START ===");

    const supabase = supabaseService();

    // Get the most recent document
    const { data: recentDoc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (docError || !recentDoc) {
      return NextResponse.json({
        success: false,
        error: "No recent document found",
      });
    }

    console.log("Most recent document:", recentDoc.title);
    console.log("Storage path:", recentDoc.storage_path);

    // Check if file exists in storage with the exact path
    let storageCheck = {
      exactPath: null,
      alternativePaths: [],
      filesInBucket: [],
    };

    try {
      // Check exact path
      const { data: exactFile, error: exactError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .download(recentDoc.storage_path);

      storageCheck.exactPath = {
        exists: !exactError && !!exactFile,
        error: exactError?.message,
      };

      // Check alternative paths
      const alternativePaths = [
        recentDoc.storage_path.replace(/^documents\//, ""), // Remove documents/ prefix
        recentDoc.title, // Just the filename
        `documents/${recentDoc.storage_path}`, // Add documents/ prefix
      ];

      for (const path of alternativePaths) {
        const { data: altFile, error: altError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .download(path);

        storageCheck.alternativePaths.push({
          path,
          exists: !altError && !!altFile,
          error: altError?.message,
        });
      }

      // List all files in bucket
      const { data: allFiles, error: listError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .list("", { limit: 20 });

      storageCheck.filesInBucket = allFiles?.map(f => ({
        name: f.name,
        size: f.metadata?.size,
        lastModified: f.updated_at,
      })) || [];

    } catch (storageError: any) {
      storageCheck.exactPath = {
        exists: false,
        error: storageError.message,
      };
    }

    console.log("=== UPLOAD DEBUG API SUCCESS ===");

    return NextResponse.json({
      success: true,
      recentDocument: {
        id: recentDoc.id,
        title: recentDoc.title,
        storagePath: recentDoc.storage_path,
        status: recentDoc.status,
        createdAt: recentDoc.created_at,
      },
      storageCheck,
      analysis: {
        pathMismatch: !storageCheck.exactPath.exists,
        hasAlternativePath: storageCheck.alternativePaths.some(p => p.exists),
        totalFilesInBucket: storageCheck.filesInBucket.length,
      },
    });
  } catch (error: any) {
    console.error("=== UPLOAD DEBUG API ERROR ===", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
