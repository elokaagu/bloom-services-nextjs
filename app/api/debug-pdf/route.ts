import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== PDF DEBUG API START (GET) ===");

    // For GET requests, we'll debug the most recent document
    const supabase = supabaseService();

    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", "550e8400-e29b-41d4-a716-446655440001")
      .order("created_at", { ascending: false })
      .limit(1);

    if (docsError || !documents || documents.length === 0) {
      console.error("No documents found:", docsError);
      return NextResponse.json(
        { error: "No documents found to debug" },
        { status: 404 }
      );
    }

    const document = documents[0];
    console.log("Debugging most recent document:", document.title);

    // Use the same logic as POST but with the found document
    return await debugDocument(document.id);
  } catch (error) {
    console.error("=== PDF DEBUG API ERROR (GET) ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

async function debugDocument(documentId: string) {
  try {
    console.log("=== PDF DEBUG API START ===");

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
    console.log("Storage path:", document.storage_path);
    console.log("Status:", document.status);

    // Try to fetch file from storage
    let fileInfo = null;
    try {
      console.log("Attempting to fetch file from storage...");
      const { data: fileData, error: fileError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .download(document.storage_path);

      if (fileError) {
        console.error("Storage error:", fileError);
        fileInfo = { error: fileError.message };
      } else if (fileData) {
        const buf = Buffer.from(await fileData.arrayBuffer());
        console.log("File buffer created, size:", buf.length);

        fileInfo = {
          success: true,
          bufferSize: buf.length,
          fileName: document.title,
          storagePath: document.storage_path,
        };

        // Try to parse PDF content
        if (document.title.endsWith(".pdf")) {
          try {
            console.log("Attempting PDF parsing...");
            const pdf = (await import("pdf-parse")).default;
            const parsed = await pdf(buf);
            const text = parsed.text.replace(/\s+/g, " ").trim();

            console.log("PDF parsing successful, text length:", text.length);

            fileInfo.pdfParsing = {
              success: true,
              textLength: text.length,
              preview:
                text.substring(0, 200) + (text.length > 200 ? "..." : ""),
            };
          } catch (parseError) {
            console.error("PDF parsing error:", parseError);
            fileInfo.pdfParsing = {
              success: false,
              error: parseError.message,
            };
          }
        }
      }
    } catch (storageError) {
      console.error("Storage fetch error:", storageError);
      fileInfo = { error: storageError.message };
    }

    // Check for existing chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, chunk_no, text")
      .eq("document_id", documentId)
      .order("chunk_no");

    console.log("=== PDF DEBUG API SUCCESS ===");

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        storagePath: document.storage_path,
        createdAt: document.created_at,
      },
      fileInfo,
      chunks: {
        count: chunks?.length || 0,
        error: chunksError?.message,
        preview:
          chunks?.slice(0, 2).map((c) => ({
            chunkNo: c.chunk_no,
            textPreview:
              c.text.substring(0, 100) + (c.text.length > 100 ? "..." : ""),
          })) || [],
      },
    });
  } catch (error) {
    console.error("=== PDF DEBUG API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    return await debugDocument(documentId);
  } catch (error) {
    console.error("=== PDF DEBUG API ERROR (POST) ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
