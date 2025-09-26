import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DOCUMENT CONTENT API START ===");

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

    // Try to get content from document chunks first
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("text, chunk_no")
      .eq("document_id", documentId)
      .order("chunk_no");

    let content = "";
    let contentSource = "";

    if (!chunksError && chunks && chunks.length > 0) {
      // Use chunks content
      content = chunks.map((chunk) => chunk.text).join("\n\n");
      contentSource = "chunks";
      console.log(`Retrieved content from ${chunks.length} chunks`);
    } else {
      // Try to get content from storage
      try {
        console.log("No chunks found, trying to fetch from storage...");
        const { data: fileData, error: fileError } = await supabase.storage
          .from(process.env.STORAGE_BUCKET || "documents")
          .download(document.storage_path);

        if (!fileError && fileData) {
          const buf = Buffer.from(await fileData.arrayBuffer());

          // Parse by file type
          if (document.title.endsWith(".pdf")) {
            const pdf = (await import("pdf-parse")).default;
            const parsed = await pdf(buf);
            content = parsed.text;
          } else if (document.title.endsWith(".docx")) {
            const mammoth = (await import("mammoth")).default;
            const parsed = await mammoth.extractRawText({ buffer: buf });
            content = parsed.value;
          } else if (document.title.endsWith(".txt")) {
            content = buf.toString("utf8");
          } else {
            content = buf.toString("utf8");
          }

          contentSource = "storage";
          console.log(
            "Retrieved content from storage, length:",
            content.length
          );
        } else {
          console.error("Storage fetch failed:", fileError);
          console.error("Document status:", document.status);
          console.error("Storage path:", document.storage_path);
          
          if (document.status === "processing") {
            content = `# ${document.title}\n\nThis document is currently being processed and will be available for full viewing shortly. Please check back later for the complete content.\n\n**Status:** Processing\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}`;
          } else if (document.status === "failed") {
            content = `# ${document.title}\n\nThis document failed to process. Please try re-uploading it.\n\n**Status:** Failed\n**Error:** ${document.error || "Unknown error"}\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}`;
          } else if (document.status === "uploading") {
            content = `# ${document.title}\n\nThis document is still being uploaded. Please wait a moment and refresh the page.\n\n**Status:** Uploading\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}`;
          } else {
            content = `# ${document.title}\n\nThis document needs to be processed before it can be viewed. The processing usually happens automatically after upload.\n\n**Status:** ${document.status}\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}\n\n**To fix this:**\n1. Go back to the Document Library\n2. Try re-uploading the document\n3. Or contact support if the issue persists`;
          }
          contentSource = "fallback";
        }
      } catch (storageError) {
        console.error("Storage error:", storageError);
        console.error("Document status:", document.status);
        console.error("Storage path:", document.storage_path);
        
        if (document.status === "processing") {
          content = `# ${document.title}\n\nThis document is currently being processed and will be available for full viewing shortly. Please check back later for the complete content.\n\n**Status:** Processing\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}`;
        } else if (document.status === "failed") {
          content = `# ${document.title}\n\nThis document failed to process. Please try re-uploading it.\n\n**Status:** Failed\n**Error:** ${document.error || "Unknown error"}\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}`;
        } else if (document.status === "uploading") {
          content = `# ${document.title}\n\nThis document is still being uploaded. Please wait a moment and refresh the page.\n\n**Status:** Uploading\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}`;
        } else {
          content = `# ${document.title}\n\nThis document needs to be processed before it can be viewed. The processing usually happens automatically after upload.\n\n**Status:** ${document.status}\n**Uploaded:** ${new Date(document.created_at).toLocaleDateString()}\n\n**To fix this:**\n1. Go back to the Document Library\n2. Try re-uploading the document\n3. Or contact support if the issue persists`;
        }
        contentSource = "fallback";
      }
    }

    // Clean up content
    content = content.replace(/\s+/g, " ").trim();

    console.log("=== DOCUMENT CONTENT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        summary: document.summary,
        uploadedAt: document.created_at,
        owner: document.owner_id,
      },
      content,
      contentSource,
      contentLength: content.length,
      hasChunks: chunks?.length || 0,
    });
  } catch (error) {
    console.error("=== DOCUMENT CONTENT API ERROR ===", error);
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
