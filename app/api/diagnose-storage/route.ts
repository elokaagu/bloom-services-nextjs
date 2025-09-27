import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== COMPREHENSIVE STORAGE DIAGNOSTIC START ===");

    const supabase = supabaseService();
    const bucketName = process.env.STORAGE_BUCKET || "documents";

    const results: any = {
      environment: {
        bucketName,
        supabaseUrl: process.env.SUPABASE_URL ? "Set" : "Missing",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "Set"
          : "Missing",
      },
      bucketInfo: null,
      fileListing: null,
      testUpload: null,
      testDownload: null,
      errors: [],
    };

    // Test 1: Check if bucket exists
    try {
      console.log("Checking bucket existence...");
      const { data: buckets, error: bucketsError } =
        await supabase.storage.listBuckets();

      if (bucketsError) {
        results.errors.push(`Bucket listing error: ${bucketsError.message}`);
      } else {
        results.bucketInfo = {
          availableBuckets:
            buckets?.map((b) => ({
              name: b.name,
              public: b.public,
              createdAt: b.created_at,
            })) || [],
          targetBucketExists:
            buckets?.some((b) => b.name === bucketName) || false,
        };
        console.log(
          "Available buckets:",
          buckets?.map((b) => b.name)
        );
      }
    } catch (error: any) {
      results.errors.push(`Bucket check error: ${error.message}`);
    }

    // Test 2: List files in bucket
    try {
      console.log("Listing files in bucket...");
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list("", { limit: 50 });

      if (listError) {
        results.errors.push(`File listing error: ${listError.message}`);
      } else {
        results.fileListing = {
          files:
            files?.map((f) => ({
              name: f.name,
              size: f.metadata?.size,
              lastModified: f.updated_at,
              isPublic: f.metadata?.isPublic,
            })) || [],
          count: files?.length || 0,
        };
        console.log(`Found ${files?.length || 0} files in bucket`);
      }
    } catch (error: any) {
      results.errors.push(`File listing error: ${error.message}`);
    }

    // Test 3: Try to create bucket if it doesn't exist
    if (results.bucketInfo && !results.bucketInfo.targetBucketExists) {
      try {
        console.log("Creating missing bucket...");
        const { data: newBucket, error: createError } =
          await supabase.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: [
              "application/pdf",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "text/plain",
            ],
            fileSizeLimit: 50 * 1024 * 1024, // 50MB
          });

        if (createError) {
          results.errors.push(`Bucket creation error: ${createError.message}`);
        } else {
          results.bucketInfo.bucketCreated = true;
          console.log("Bucket created successfully");
        }
      } catch (error: any) {
        results.errors.push(`Bucket creation error: ${error.message}`);
      }
    }

    // Test 4: Test file upload
    try {
      console.log("Testing file upload...");
      const testContent = `Test file created at ${new Date().toISOString()}`;
      const testFileName = `test-${Date.now()}.txt`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(testFileName, testContent, {
          contentType: "text/plain",
          cacheControl: "3600",
        });

      if (uploadError) {
        results.errors.push(`Test upload error: ${uploadError.message}`);
      } else {
        results.testUpload = {
          success: true,
          fileName: testFileName,
          path: uploadData.path,
        };
        console.log("Test upload successful:", uploadData.path);

        // Test 5: Test file download
        try {
          console.log("Testing file download...");
          const { data: downloadData, error: downloadError } =
            await supabase.storage.from(bucketName).download(testFileName);

          if (downloadError) {
            results.errors.push(
              `Test download error: ${downloadError.message}`
            );
          } else {
            const content = await downloadData.text();
            results.testDownload = {
              success: true,
              contentLength: content.length,
              contentMatches: content === testContent,
            };
            console.log("Test download successful");
          }

          // Clean up test file
          await supabase.storage.from(bucketName).remove([testFileName]);
          console.log("Test file cleaned up");
        } catch (downloadError: any) {
          results.errors.push(`Test download error: ${downloadError.message}`);
        }
      }
    } catch (uploadError: any) {
      results.errors.push(`Test upload error: ${uploadError.message}`);
    }

    // Test 6: Check recent documents
    try {
      console.log("Checking recent documents...");
      const { data: documents, error: docsError } = await supabase
        .from("documents")
        .select("id, title, storage_path, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (docsError) {
        results.errors.push(`Documents query error: ${docsError.message}`);
      } else {
        results.recentDocuments =
          documents?.map((doc) => ({
            id: doc.id,
            title: doc.title,
            storagePath: doc.storage_path,
            status: doc.status,
            createdAt: doc.created_at,
          })) || [];
        console.log(`Found ${documents?.length || 0} recent documents`);
      }
    } catch (error: any) {
      results.errors.push(`Documents query error: ${error.message}`);
    }

    console.log("=== COMPREHENSIVE STORAGE DIAGNOSTIC SUCCESS ===");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalErrors: results.errors.length,
        bucketExists: results.bucketInfo?.targetBucketExists || false,
        filesInBucket: results.fileListing?.count || 0,
        uploadWorks: results.testUpload?.success || false,
        downloadWorks: results.testDownload?.success || false,
        recentDocuments: results.recentDocuments?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("=== COMPREHENSIVE STORAGE DIAGNOSTIC ERROR ===", error);
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
