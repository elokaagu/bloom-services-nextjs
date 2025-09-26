import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== STORAGE TEST API START ===");

    const supabase = supabaseService();
    const bucketName = process.env.STORAGE_BUCKET || "documents";

    console.log("Testing storage bucket:", bucketName);

    // Test 1: List files in storage
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list("documents", { limit: 20 });

    console.log("Files in storage:", files);
    console.log("List error:", listError);

    // Test 2: Try to list root directory
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from(bucketName)
      .list("", { limit: 20 });

    console.log("Root files:", rootFiles);
    console.log("Root error:", rootError);

    // Test 3: Check bucket info
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    console.log("Available buckets:", buckets);
    console.log("Buckets error:", bucketsError);

    console.log("=== STORAGE TEST API SUCCESS ===");

    return NextResponse.json({
      success: true,
      bucket: bucketName,
      files: files || [],
      rootFiles: rootFiles || [],
      buckets: buckets || [],
      errors: {
        listError: listError?.message,
        rootError: rootError?.message,
        bucketsError: bucketsError?.message,
      },
    });
  } catch (error: any) {
    console.error("=== STORAGE TEST API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
