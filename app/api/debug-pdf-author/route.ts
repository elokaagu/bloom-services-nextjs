import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { advancedPDFProcessor } from "@/lib/advanced-pdf-processor";

async function debugPdfAuthor(documentId: string) {
  try {
    const supabase = supabaseService();

    // Fetch document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return { error: "Document not found", details: docError?.message };
    }

    if (!document.storage_path || !document.title.endsWith(".pdf")) {
      return { error: "Document is not a PDF or has no storage path" };
    }

    // Download PDF from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .download(document.storage_path);

    if (fileError) {
      return { error: `Storage error: ${fileError.message}` };
    }

    const buf = Buffer.from(await fileData.arrayBuffer());

    // Process PDF to extract metadata
    const result = await advancedPDFProcessor.processPDF(buf);
    const pdfAuthor = result.metadata.author || result.metadata.creator;

    let ownerUpdate: any = {
      metadata: result.metadata,
      page_data: result.pages.map(page => ({
        pageNumber: page.pageNumber,
        imageData: page.imageData,
        text: page.text,
        formattedText: page.formattedText,
      })),
    };

    let newOwnerId = document.owner_id;
    let userAction = "No author found in PDF metadata, owner not changed.";

    if (pdfAuthor) {
      // Check if user exists, if not create them
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("name", pdfAuthor)
        .single();

      if (existingUser) {
        newOwnerId = existingUser.id;
        userAction = `Updated document owner to existing user: ${pdfAuthor}`;
      } else {
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([{
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: pdfAuthor,
            email: `${pdfAuthor.toLowerCase().replace(/\s+/g, '.')}.pdf-author.local`,
          }])
          .select()
          .single();

        if (!userError && newUser) {
          newOwnerId = newUser.id;
          userAction = `Created new user and updated document owner: ${pdfAuthor}`;
        } else {
          userAction = `Failed to create new user for ${pdfAuthor}: ${userError?.message}`;
        }
      }
      ownerUpdate = { ...ownerUpdate, owner_id: newOwnerId };
    }

    // Update document in database
    const { data: updatedDocument, error: updateError } = await supabase
      .from("documents")
      .update(ownerUpdate)
      .eq("id", documentId)
      .select()
      .single();

    if (updateError) {
      return { error: `Database update error: ${updateError.message}` };
    }

    return {
      success: true,
      message: "Document owner and metadata debugged and updated successfully",
      document: updatedDocument,
      extractedPdfMetadata: result.metadata,
      pdfAuthor: pdfAuthor,
      userAction: userAction,
    };
  } catch (error) {
    console.error("Debug PDF author error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== DEBUG PDF AUTHOR EXTRACTION (POST) ===");
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }
    
    const debugResult = await debugPdfAuthor(documentId);
    if (debugResult.error) {
      return NextResponse.json({ error: debugResult.error, details: debugResult.details }, { status: 500 });
    }
    return NextResponse.json(debugResult);
  } catch (error: any) {
    console.error("=== DEBUG PDF AUTHOR EXTRACTION ERROR (POST) ===", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG PDF AUTHOR EXTRACTION (GET) ===");
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const debugResult = await debugPdfAuthor(documentId);
    if (debugResult.error) {
      return NextResponse.json({ error: debugResult.error, details: debugResult.details }, { status: 500 });
    }
    return NextResponse.json(debugResult);
  } catch (error: any) {
    console.error("=== DEBUG PDF AUTHOR EXTRACTION ERROR (GET) ===", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}