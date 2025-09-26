import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DOCUMENT PREVIEW API START ===");

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

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

    console.log("Document found:", document.title);

    // Try to get file content from storage
    let previewContent = "";
    let previewType = "text";
    let fileSize = 0;
    let contentSource = "";

    try {
      if (document.storage_path) {
        console.log("Fetching file from storage:", document.storage_path);
        
        const { data: fileData, error: fileError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .download(document.storage_path);

        if (!fileError && fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          fileSize = buffer.length;
          
          console.log("File buffer created, size:", buffer.length);

          // Parse content based on file type
          if (document.title.endsWith(".pdf")) {
            try {
              const pdf = (await import("pdf-parse")).default;
              const parsed = await pdf(buffer);
              previewContent = parsed.text.replace(/\s+/g, " ").trim();
              previewType = "pdf";
              contentSource = "storage";
              console.log("PDF preview generated, text length:", previewContent.length);
            } catch (pdfError: any) {
              console.error("PDF parsing error:", pdfError);
              previewContent = `PDF file (${(fileSize / 1024 / 1024).toFixed(1)} MB) - Content preview unavailable`;
              previewType = "pdf-error";
            }
          } else if (document.title.endsWith(".docx")) {
            try {
              const mammoth = (await import("mammoth")).default;
              const parsed = await mammoth.extractRawText({ buffer });
              previewContent = parsed.value.replace(/\s+/g, " ").trim();
              previewType = "docx";
              contentSource = "storage";
              console.log("DOCX preview generated, text length:", previewContent.length);
            } catch (docxError: any) {
              console.error("DOCX parsing error:", docxError);
              previewContent = `Word document (${(fileSize / 1024 / 1024).toFixed(1)} MB) - Content preview unavailable`;
              previewType = "docx-error";
            }
          } else if (document.title.endsWith(".txt")) {
            previewContent = buffer.toString("utf8").replace(/\s+/g, " ").trim();
            previewType = "text";
            contentSource = "storage";
            console.log("TXT preview generated, text length:", previewContent.length);
          } else {
            // For other file types, try to extract text
            previewContent = buffer.toString("utf8").replace(/\s+/g, " ").trim();
            previewType = "text";
            contentSource = "storage";
            console.log("Generic text preview generated, text length:", previewContent.length);
          }

          // Limit preview content to first 500 characters
          if (previewContent.length > 500) {
            previewContent = previewContent.substring(0, 500) + "...";
          }
        } else {
          console.log("Storage fetch failed:", fileError?.message);
          contentSource = "storage-error";
        }
      }

      // If storage failed, try to get content from chunks
      if (!previewContent && contentSource !== "storage-error") {
        console.log("Fetching content from document chunks");
        const { data: chunks, error: chunksError } = await supabase
          .from("document_chunks")
          .select("text")
          .eq("document_id", documentId)
          .order("chunk_no")
          .limit(3); // Only get first 3 chunks for preview

        if (!chunksError && chunks && chunks.length > 0) {
          previewContent = chunks.map((chunk) => chunk.text).join(" ");
          previewType = "chunks";
          contentSource = "chunks";
          console.log(`Retrieved preview from ${chunks.length} chunks`);
          
          // Limit preview content
          if (previewContent.length > 500) {
            previewContent = previewContent.substring(0, 500) + "...";
          }
        } else {
          console.log("No chunks found:", chunksError?.message);
        }
      }

      // If still no content, create a basic preview
      if (!previewContent) {
        const fileExt = document.title.split(".").pop()?.toUpperCase() || "FILE";
        previewContent = `${fileExt} document - Content preview not available`;
        previewType = "unavailable";
        contentSource = "metadata";
      }

    } catch (error: any) {
      console.error("Content retrieval error:", error);
      previewContent = "Content preview unavailable";
      previewType = "error";
      contentSource = "error";
    }

    console.log("=== DOCUMENT PREVIEW API SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        fileSize: fileSize > 0 ? `${(fileSize / 1024 / 1024).toFixed(1)} MB` : "Size not available",
        uploadedAt: document.created_at,
        summary: document.summary,
      },
      preview: {
        content: previewContent,
        type: previewType,
        source: contentSource,
        truncated: previewContent.endsWith("..."),
      },
    });
  } catch (error: any) {
    console.error("=== DOCUMENT PREVIEW API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
