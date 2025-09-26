import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PDF LIBRARY TEST START ===");
    
    // Test if pdf-parse library is available and working
    let libraryTest = {
      available: false,
      version: null,
      error: null,
    };

    try {
      const pdfParse = await import("pdf-parse");
      libraryTest.available = true;
      libraryTest.version = pdfParse.default ? "loaded" : "not loaded";
      console.log("PDF-parse library loaded successfully");
    } catch (importError) {
      libraryTest.error = importError.message;
      console.error("PDF-parse library import failed:", importError);
    }

    // Test with a simple buffer (empty PDF-like structure)
    let parsingTest = {
      success: false,
      error: null,
      details: null,
    };

    if (libraryTest.available) {
      try {
        // Create a minimal PDF buffer for testing
        const testBuffer = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF Content) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`);

        const pdf = (await import("pdf-parse")).default;
        const parsed = await pdf(testBuffer);
        
        parsingTest.success = true;
        parsingTest.details = {
          textLength: parsed.text.length,
          pageCount: parsed.numpages,
          hasText: parsed.text.includes("Test PDF Content"),
          info: parsed.info,
        };
        
        console.log("PDF parsing test successful:", parsingTest.details);
      } catch (parseError) {
        parsingTest.error = parseError.message;
        console.error("PDF parsing test failed:", parseError);
      }
    }

    // Test mammoth library for DOCX files
    let mammothTest = {
      available: false,
      error: null,
    };

    try {
      const mammoth = await import("mammoth");
      mammothTest.available = true;
      console.log("Mammoth library loaded successfully");
    } catch (importError) {
      mammothTest.error = importError.message;
      console.error("Mammoth library import failed:", importError);
    }

    console.log("=== PDF LIBRARY TEST SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: "PDF library test completed",
      tests: {
        pdfParse: libraryTest,
        pdfParsing: parsingTest,
        mammoth: mammothTest,
      },
      recommendations: [
        !libraryTest.available && "Install pdf-parse library: npm install pdf-parse",
        !parsingTest.success && "Fix PDF parsing configuration",
        !mammothTest.available && "Install mammoth library: npm install mammoth",
        libraryTest.available && parsingTest.success && "PDF reading is working correctly",
      ].filter(Boolean),
    });

  } catch (error) {
    console.error("=== PDF LIBRARY TEST ERROR ===", error);
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
