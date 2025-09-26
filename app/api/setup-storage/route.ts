import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== STORAGE BUCKET SETUP API START ===");

    const supabase = supabaseService();
    const bucketName = process.env.STORAGE_BUCKET || "documents";

    console.log("Checking storage bucket:", bucketName);

    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    console.log("Available buckets:", buckets);
    console.log("Buckets error:", bucketsError);

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      console.log("Bucket does not exist, creating it...");
      
      // Create the bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      });

      if (createError) {
        console.error("Error creating bucket:", createError);
        return NextResponse.json({
          success: false,
          error: `Failed to create bucket: ${createError.message}`,
          bucketName,
          availableBuckets: buckets?.map(b => b.name) || [],
        }, { status: 500 });
      }

      console.log("Bucket created successfully:", newBucket);
    } else {
      console.log("Bucket already exists");
    }

    // Test file upload
    console.log("Testing file upload...");
    const testContent = "This is a test file for storage verification.";
    const testFileName = `test-${Date.now()}.txt`;
    const testPath = `documents/${testFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error("Test upload error:", uploadError);
      return NextResponse.json({
        success: false,
        error: `Test upload failed: ${uploadError.message}`,
        bucketName,
        bucketExists,
      }, { status: 500 });
    }

    console.log("Test file uploaded successfully:", uploadData);

    // Test file download
    console.log("Testing file download...");
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testPath);

    if (downloadError) {
      console.error("Test download error:", downloadError);
    } else {
      console.log("Test file downloaded successfully");
    }

    // Clean up test file
    await supabase.storage
      .from(bucketName)
      .remove([testPath]);

    console.log("=== STORAGE BUCKET SETUP API SUCCESS ===");

    return NextResponse.json({
      success: true,
      bucketName,
      bucketExists: bucketExists || true, // Will be true if we created it
      testUpload: {
        success: !uploadError,
        path: uploadData?.path,
        error: uploadError?.message,
      },
      testDownload: {
        success: !downloadError,
        error: downloadError?.message,
      },
      availableBuckets: buckets?.map(b => ({
        name: b.name,
        public: b.public,
        createdAt: b.created_at,
      })) || [],
    });
  } catch (error: any) {
    console.error("=== STORAGE BUCKET SETUP API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
