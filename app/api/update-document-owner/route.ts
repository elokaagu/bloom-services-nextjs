import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { advancedPDFProcessor } from "@/lib/advanced-pdf-processor";

export async function POST(req: NextRequest) {
  try {
    console.log("=== UPDATE DOCUMENT OWNER FROM PDF METADATA START ===");

    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

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

    console.log(`Processing document: ${document.title} (${document.id})`);

    // Check if document already has metadata
    if (document.metadata && document.metadata.author) {
      console.log(
        "Document already has author metadata:",
        document.metadata.author
      );
      return NextResponse.json({
        success: true,
        message: "Document already has author metadata",
        author: document.metadata.author,
      });
    }

    // Download file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET || "documents")
      .download(document.storage_path);

    if (fileError) {
      console.error("File not found in storage:", fileError);
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    console.log("File found in storage, processing PDF metadata...");

    // Process PDF to extract metadata
    const buf = Buffer.from(await fileData.arrayBuffer());
    const result = await advancedPDFProcessor.processPDF(buf);

    console.log("PDF metadata extracted:", result.metadata);

    // Extract author from PDF metadata
    const pdfAuthor = result.metadata.author || result.metadata.creator;

    if (!pdfAuthor) {
      console.log("No author found in PDF metadata");
      return NextResponse.json({
        success: true,
        message: "No author found in PDF metadata",
        metadata: result.metadata,
      });
    }

    console.log("PDF author found:", pdfAuthor);

    // Check if user exists, if not create them
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, name")
      .eq("name", pdfAuthor)
      .single();

    let userId = existingUser?.id;

    if (!existingUser) {
      // Create new user for PDF author
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
        console.error("Error creating user:", userError);
        return NextResponse.json(
          { error: "Failed to create user for PDF author" },
          { status: 500 }
        );
      }

      userId = newUser.id;
      console.log("Created new user for PDF author:", pdfAuthor);
    } else {
      console.log("Found existing user for PDF author:", pdfAuthor);
    }

    // Update document with new owner and metadata
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        owner_id: userId,
        metadata: result.metadata,
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document:", updateError);
      return NextResponse.json(
        { error: "Failed to update document owner" },
        { status: 500 }
      );
    }

    console.log("Document owner updated successfully");

    return NextResponse.json({
      success: true,
      message: "Document owner updated from PDF metadata",
      document: {
        id: document.id,
        title: document.title,
        author: pdfAuthor,
        userId: userId,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("=== UPDATE DOCUMENT OWNER ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
