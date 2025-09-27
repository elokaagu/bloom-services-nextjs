import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { advancedPDFProcessor } from "@/lib/advanced-pdf-processor";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG PDF AUTHOR EXTRACTION (GET) ===");
    
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required as query parameter" },
        { status: 400 }
      );
    }
    
    return await debugPDFAuthor(documentId);
  } catch (error) {
    console.error("=== DEBUG PDF AUTHOR EXTRACTION ERROR (GET) ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== DEBUG PDF AUTHOR EXTRACTION (POST) ===");

    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }
    
    return await debugPDFAuthor(documentId);
  } catch (error) {
    console.error("=== DEBUG PDF AUTHOR EXTRACTION ERROR (POST) ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function debugPDFAuthor(documentId: string) {
  try {
    console.log("=== DEBUG PDF AUTHOR EXTRACTION ===");
    console.log("Document ID:", documentId);

    const supabase = supabaseService();

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.error("Document not found:", docError);
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    console.log("Document found:", document.title);
    console.log("Current owner_id:", document.owner_id);

    // Get current owner details
    const { data: currentOwner } = await supabase
      .from("users")
      .select("*")
      .eq("id", document.owner_id)
      .single();

    console.log("Current owner:", currentOwner);

    if (!document.storage_path || !document.title.endsWith(".pdf")) {
      return NextResponse.json({
        success: false,
        message: "Document is not a PDF or has no storage path",
        currentOwner: currentOwner,
      });
    }

    // Download PDF from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .download(document.storage_path);

    if (fileError) {
      console.error("Storage download error:", fileError);
      return NextResponse.json(
        { error: `Storage error: ${fileError.message}` },
        { status: 500 }
      );
    }

    const buf = Buffer.from(await fileData.arrayBuffer());

    // Process PDF to extract metadata
    console.log("Processing PDF for metadata extraction...");
    const result = await advancedPDFProcessor.processPDF(buf);
    
    console.log("PDF metadata extracted:");
    console.log("- Title:", result.metadata.title);
    console.log("- Author:", result.metadata.author);
    console.log("- Creator:", result.metadata.creator);
    console.log("- Subject:", result.metadata.subject);
    console.log("- Producer:", result.metadata.producer);

    const pdfAuthor = result.metadata.author || result.metadata.creator;
    
    if (!pdfAuthor) {
      return NextResponse.json({
        success: false,
        message: "No author found in PDF metadata",
        metadata: result.metadata,
        currentOwner: currentOwner,
      });
    }

    console.log("PDF author found:", pdfAuthor);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("name", pdfAuthor)
      .single();

    console.log("Existing user found:", existingUser);

    if (existingUser) {
      // Update document owner
      const { error: updateError } = await supabase
        .from("documents")
        .update({ owner_id: existingUser.id })
        .eq("id", documentId);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { error: `Update error: ${updateError.message}` },
          { status: 500 }
        );
      }

      console.log("Document owner updated to:", existingUser.name);

      return NextResponse.json({
        success: true,
        message: "Document owner updated successfully",
        pdfAuthor: pdfAuthor,
        newOwner: existingUser,
        metadata: result.metadata,
      });
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: pdfAuthor,
            email: `${pdfAuthor
              .toLowerCase()
              .replace(/\s+/g, ".")}@pdf-author.local`,
          },
        ])
        .select()
        .single();

      if (userError) {
        console.error("User creation error:", userError);
        return NextResponse.json(
          { error: `User creation error: ${userError.message}` },
          { status: 500 }
        );
      }

      // Update document owner
      const { error: updateError } = await supabase
        .from("documents")
        .update({ owner_id: newUser.id })
        .eq("id", documentId);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { error: `Update error: ${updateError.message}` },
          { status: 500 }
        );
      }

      console.log("New user created and document owner updated:", newUser.name);

      return NextResponse.json({
        success: true,
        message: "New user created and document owner updated",
        pdfAuthor: pdfAuthor,
        newOwner: newUser,
        metadata: result.metadata,
      });
    }
  } catch (error) {
    console.error("=== DEBUG PDF AUTHOR EXTRACTION ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}