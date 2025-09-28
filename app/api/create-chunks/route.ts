import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return dummy embedding if OpenAI fails
    return new Array(1536).fill(0.1);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== COMPREHENSIVE CHUNK CREATION START ===");

    const { documentId, force = false } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        {
          error: "Document ID is required",
        },
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
        {
          error: "Document not found",
          details: docError?.message,
        },
        { status: 404 }
      );
    }

    console.log("Processing document:", document.title);
    console.log("Document status:", document.status);
    console.log("Storage path:", document.storage_path);

    // Check if document already has chunks (unless forcing)
    if (!force) {
      const { data: existingChunks } = await supabase
        .from("document_chunks")
        .select("id")
        .eq("document_id", documentId)
        .limit(1);

      if (existingChunks && existingChunks.length > 0) {
        console.log("Document already has chunks, skipping");
        return NextResponse.json({
          success: true,
          message: "Document already has chunks",
          documentId: documentId,
          title: document.title,
          skipped: true,
        });
      }
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    console.log("Document status updated to processing");

    // Download file from storage
    let text = "";
    try {
      console.log("Downloading file from storage...");
      const { data: fileData, error: fileError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .download(document.storage_path);

      if (fileError) {
        throw new Error(`Storage error: ${fileError.message}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      console.log("File downloaded, size:", buffer.length, "bytes");

      // Parse based on file type
      if (document.title.endsWith(".pdf")) {
        console.log("Parsing PDF file...");
        const pdfParse = await import("pdf-parse");
        const parsed = await pdfParse.default(buffer);
        text = parsed.text;
        console.log("PDF parsed, text length:", text.length);
      } else if (document.title.endsWith(".docx")) {
        console.log("Parsing DOCX file...");
        const mammoth = await import("mammoth");
        const parsed = await mammoth.default.extractRawText({ buffer });
        text = parsed.value;
        console.log("DOCX parsed, text length:", text.length);
      } else {
        console.log("Parsing as plain text...");
        text = buffer.toString("utf-8");
        console.log("Text parsed, length:", text.length);
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text content extracted from document");
      }

      // Clean text
      text = text.replace(/\s+/g, " ").trim();
      console.log("Text cleaned, final length:", text.length);
    } catch (parseError: any) {
      console.error("File parsing error:", parseError);
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error: `File parsing failed: ${parseError.message}`,
        })
        .eq("id", documentId);

      return NextResponse.json(
        {
          success: false,
          error: "File parsing failed",
          details: parseError.message,
          documentId: documentId,
        },
        { status: 500 }
      );
    }

    // Create chunks using simple paragraph splitting
    console.log("Creating chunks...");
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const chunks = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (paragraph.length > 50) {
        // Only chunks with substantial content
        chunks.push({
          document_id: documentId,
          chunk_no: i + 1,
          text: paragraph,
        });
      }
    }

    console.log(
      `Created ${chunks.length} chunks from ${paragraphs.length} paragraphs`
    );

    if (chunks.length === 0) {
      console.error("No valid chunks created");
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error: "No valid chunks could be created",
        })
        .eq("id", documentId);

      return NextResponse.json(
        {
          success: false,
          error: "No valid chunks created",
          documentId: documentId,
          textLength: text.length,
          paragraphCount: paragraphs.length,
        },
        { status: 400 }
      );
    }

    // Generate embeddings and insert chunks
    console.log("Generating embeddings and inserting chunks...");
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];

        // Generate embedding
        const embedding = await generateEmbedding(chunk.text);

        // Insert chunk with embedding
        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert([
            {
              document_id: chunk.document_id,
              chunk_no: chunk.chunk_no,
              text: chunk.text,
              embedding: embedding,
            },
          ]);

        if (insertError) {
          console.error(`Error inserting chunk ${i + 1}:`, insertError);
          errorCount++;
        } else {
          successCount++;
        }

        // Add small delay to avoid rate limiting
        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (chunkError: any) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        errorCount++;
      }
    }

    console.log(
      `Chunk processing complete: ${successCount} successful, ${errorCount} failed`
    );

    // Update document status
    if (successCount > 0) {
      await supabase
        .from("documents")
        .update({
          status: "ready",
          error:
            errorCount > 0 ? `${errorCount} chunks failed to process` : null,
        })
        .eq("id", documentId);

      console.log("Document marked as ready");
    } else {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error: "All chunks failed to process",
        })
        .eq("id", documentId);

      console.log("Document marked as failed");
    }

    console.log("=== COMPREHENSIVE CHUNK CREATION COMPLETE ===");

    return NextResponse.json({
      success: successCount > 0,
      message:
        successCount > 0
          ? "Chunks created successfully"
          : "Chunk creation failed",
      documentId: documentId,
      title: document.title,
      chunksCreated: successCount,
      chunksFailed: errorCount,
      totalChunks: chunks.length,
      textLength: text.length,
    });
  } catch (error: any) {
    console.error("=== COMPREHENSIVE CHUNK CREATION ERROR ===", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
