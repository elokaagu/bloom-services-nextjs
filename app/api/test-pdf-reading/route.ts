import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PDF READING TEST START ===");
    
    const supabase = supabaseService();
    
    // Find all PDF documents
    const { data: pdfDocuments, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", "550e8400-e29b-41d4-a716-446655440001")
      .ilike("title", "%.pdf")
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("Error fetching PDF documents:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch PDF documents", details: docsError.message },
        { status: 500 }
      );
    }

    if (!pdfDocuments || pdfDocuments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No PDF documents found",
        pdfCount: 0,
        results: [],
      });
    }

    console.log(`Found ${pdfDocuments.length} PDF documents to test`);

    const results = [];
    
    for (const doc of pdfDocuments) {
      try {
        console.log(`Testing PDF reading for: ${doc.title} (${doc.id})`);
        
        const testResult = {
          documentId: doc.id,
          title: doc.title,
          status: doc.status,
          storagePath: doc.storage_path,
          tests: {
            storageAccess: false,
            fileDownload: false,
            pdfParsing: false,
            textExtraction: false,
            chunkCreation: false,
          },
          details: {},
          errors: [],
        };

        // Test 1: Storage Access
        try {
          console.log("Testing storage access...");
          const { data: fileData, error: fileError } = await supabase.storage
            .from(process.env.STORAGE_BUCKET || "documents")
            .download(doc.storage_path);

          if (fileError) {
            testResult.errors.push(`Storage access failed: ${fileError.message}`);
            testResult.details.storageError = fileError.message;
          } else if (fileData) {
            testResult.tests.storageAccess = true;
            testResult.details.fileSize = fileData.size;
            console.log("Storage access successful, file size:", fileData.size);
          }
        } catch (storageError) {
          testResult.errors.push(`Storage access error: ${storageError.message}`);
          testResult.details.storageError = storageError.message;
        }

        // Test 2: File Download and Buffer Creation
        if (testResult.tests.storageAccess) {
          try {
            console.log("Testing file download and buffer creation...");
            const { data: fileData } = await supabase.storage
              .from(process.env.STORAGE_BUCKET || "documents")
              .download(doc.storage_path);

            const buf = Buffer.from(await fileData.arrayBuffer());
            testResult.tests.fileDownload = true;
            testResult.details.bufferSize = buf.length;
            console.log("File download successful, buffer size:", buf.length);

            // Test 3: PDF Parsing
            try {
              console.log("Testing PDF parsing...");
              const pdf = (await import("pdf-parse")).default;
              const parsed = await pdf(buf);
              
              testResult.tests.pdfParsing = true;
              testResult.details.rawTextLength = parsed.text.length;
              testResult.details.pageCount = parsed.numpages;
              testResult.details.pdfInfo = {
                pages: parsed.numpages,
                info: parsed.info,
              };
              console.log("PDF parsing successful, text length:", parsed.text.length);

              // Test 4: Text Extraction and Cleaning
              if (parsed.text && parsed.text.length > 0) {
                const cleanedText = parsed.text.replace(/\s+/g, " ").trim();
                testResult.tests.textExtraction = true;
                testResult.details.cleanedTextLength = cleanedText.length;
                testResult.details.textPreview = cleanedText.substring(0, 200) + (cleanedText.length > 200 ? "..." : "");
                console.log("Text extraction successful, cleaned length:", cleanedText.length);

                // Test 5: Chunk Creation
                try {
                  console.log("Testing chunk creation...");
                  const chunkSize = 500;
                  const chunks = [];
                  for (let i = 0; i < cleanedText.length; i += chunkSize) {
                    chunks.push({
                      chunk_no: Math.floor(i / chunkSize),
                      text: cleanedText.substring(i, i + chunkSize),
                    });
                  }
                  
                  testResult.tests.chunkCreation = true;
                  testResult.details.chunkCount = chunks.length;
                  testResult.details.chunkPreview = chunks.slice(0, 2).map(c => ({
                    chunkNo: c.chunk_no,
                    textPreview: c.text.substring(0, 100) + (c.text.length > 100 ? "..." : ""),
                  }));
                  console.log("Chunk creation successful, chunks:", chunks.length);
                } catch (chunkError) {
                  testResult.errors.push(`Chunk creation failed: ${chunkError.message}`);
                  testResult.details.chunkError = chunkError.message;
                }
              } else {
                testResult.errors.push("No text content found in PDF");
                testResult.details.textError = "Empty text content";
              }
            } catch (parseError) {
              testResult.errors.push(`PDF parsing failed: ${parseError.message}`);
              testResult.details.parseError = parseError.message;
            }
          } catch (downloadError) {
            testResult.errors.push(`File download failed: ${downloadError.message}`);
            testResult.details.downloadError = downloadError.message;
          }
        }

        // Check existing chunks in database
        const { data: existingChunks, error: chunksError } = await supabase
          .from("document_chunks")
          .select("id, chunk_no, text")
          .eq("document_id", doc.id)
          .order("chunk_no");

        testResult.details.existingChunks = existingChunks?.length || 0;
        testResult.details.chunksError = chunksError?.message;

        results.push(testResult);
        console.log(`PDF test completed for ${doc.title}`);

      } catch (error) {
        console.error(`Error testing PDF ${doc.title}:`, error);
        results.push({
          documentId: doc.id,
          title: doc.title,
          status: doc.status,
          tests: {
            storageAccess: false,
            fileDownload: false,
            pdfParsing: false,
            textExtraction: false,
            chunkCreation: false,
          },
          errors: [error.message],
          details: { generalError: error.message },
        });
      }
    }

    const successCount = results.filter(r => 
      r.tests.storageAccess && 
      r.tests.fileDownload && 
      r.tests.pdfParsing && 
      r.tests.textExtraction
    ).length;

    console.log(`PDF reading test completed: ${successCount}/${results.length} PDFs readable`);
    console.log("=== PDF READING TEST SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: `PDF reading test completed: ${successCount}/${results.length} PDFs readable`,
      pdfCount: pdfDocuments.length,
      successCount,
      results,
      summary: {
        totalPDFs: pdfDocuments.length,
        readablePDFs: successCount,
        failedPDFs: pdfDocuments.length - successCount,
        commonIssues: results
          .flatMap(r => r.errors)
          .reduce((acc, error) => {
            acc[error] = (acc[error] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
      },
    });

  } catch (error) {
    console.error("=== PDF READING TEST ERROR ===", error);
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
