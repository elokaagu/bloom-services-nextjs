import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";
import mammoth from "mammoth";
import { simpleChunk } from "@/lib/utils";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VECTOR_DIM = Number(process.env.VECTOR_DIM || 1536);

async function embed(texts: string[]) {
  try {
    console.log(`Generating embeddings for ${texts.length} texts`);
    const res = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: texts,
    });
    console.log(`Successfully generated ${res.data.length} embeddings`);
    return res.data.map((d) => d.embedding);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  let documentId: string | null = null;

  try {
    console.log("=== DOCUMENT INGESTION START ===");

    // Validate environment variables first
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable");
      return NextResponse.json(
        { error: "Server configuration error - missing OpenAI API key" },
        { status: 500 }
      );
    }

    if (!process.env.EMBEDDING_MODEL) {
      console.error("Missing EMBEDDING_MODEL environment variable");
      return NextResponse.json(
        { error: "Server configuration error - missing embedding model" },
        { status: 500 }
      );
    }

    if (!process.env.STORAGE_BUCKET) {
      console.error("Missing STORAGE_BUCKET environment variable");
      return NextResponse.json(
        { error: "Server configuration error - missing storage bucket" },
        { status: 500 }
      );
    }

    const body = await req.json();
    documentId = body.documentId;

    if (!documentId) {
      console.error("No documentId provided");
      return NextResponse.json(
        { error: "documentId required" },
        { status: 400 }
      );
    }

    console.log("Processing document:", documentId);

    const supabase = supabaseService();

    // Load document from database
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docErr) {
      console.error("Database error loading document:", docErr);
      throw docErr;
    }

    if (!doc) {
      console.error("Document not found:", documentId);
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    console.log("Document found:", doc.title);

    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    console.log("Document status updated to processing");

    // Get file content from storage
    let text = "";
    try {
      // Use the storage path as-is (should be just filename now)
      const storagePath = doc.storage_path;

      console.log("Fetching file from storage:", storagePath);

      const { data: fileData, error: fileError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .download(storagePath);

      if (fileError) {
        console.error("Storage error:", fileError);
        throw fileError;
      }

      const buf = Buffer.from(await fileData.arrayBuffer());
      console.log("File buffer created, size:", buf.length);

      // Parse by file type
      if (doc.title.endsWith(".pdf")) {
        console.log("Parsing PDF file:", doc.title);
        console.log("PDF buffer size:", buf.length);

        try {
          const pdf = (await import("pdf-parse")).default;
          console.log("PDF-parse library loaded successfully");

          const parsed = await pdf(buf);
          console.log("PDF parsing completed");
          console.log("PDF pages:", parsed.numpages);
          console.log("PDF info:", parsed.info);
          console.log("Raw text length:", parsed.text.length);

          text = parsed.text;
          console.log("PDF parsed successfully, text length:", text.length);

          if (text.length === 0) {
            console.warn(
              "PDF parsing returned empty text - this might be a scanned PDF or image-based PDF"
            );
          }
        } catch (pdfError) {
          console.error("PDF parsing error:", pdfError);
          throw new Error(`PDF parsing failed: ${pdfError.message}`);
        }
      } else if (doc.title.endsWith(".docx")) {
        console.log("Parsing DOCX file");
        const parsed = await mammoth.extractRawText({ buffer: buf });
        text = parsed.value;
        console.log("DOCX parsed, text length:", text.length);
      } else if (doc.title.endsWith(".txt")) {
        console.log("Parsing TXT file");
        text = buf.toString("utf8");
        console.log("TXT parsed, text length:", text.length);
      } else {
        console.log("Parsing as plain text");
        text = buf.toString("utf8");
        console.log("Plain text parsed, text length:", text.length);
      }

      // Clean up text
      text = text.replace(/\s+/g, " ").trim();

      if (text.length === 0) {
        throw new Error("No text content found in document");
      }

      console.log("Text cleaned, final length:", text.length);
    } catch (parseError) {
      console.error("File parsing error:", parseError);
      await supabase
        .from("documents")
        .update({ status: "failed", error: parseError.message })
        .eq("id", documentId);
      throw parseError;
    }

    // Create chunks
    console.log("Creating document chunks");
    const chunks = simpleChunk(text);
    console.log("Created", chunks.length, "chunks");

    // Generate embeddings
    console.log("Generating embeddings");
    const embeddings = await embed(chunks.map((c) => c.text));
    console.log("Generated", embeddings.length, "embeddings");

    // Insert chunks into database
    console.log("Inserting chunks into database");
    const rows = chunks.map((c, i) => ({
      document_id: documentId,
      chunk_no: c.chunk_no,
      text: c.text,
      embedding: embeddings[i] as any,
    }));

    const { error: insErr } = await supabase
      .from("document_chunks")
      .insert(rows);

    if (insErr) {
      console.error("Database error inserting chunks:", insErr);
      throw insErr;
    }

    console.log("Chunks inserted successfully");

    // Update document status to ready
    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", documentId);

    console.log("Document status updated to ready");
    console.log("=== DOCUMENT INGESTION SUCCESS ===");

    return NextResponse.json({
      success: true,
      chunks: rows.length,
      documentId: documentId,
    });
  } catch (e: any) {
    console.error("=== DOCUMENT INGESTION ERROR ===", e);

    // Mark document as failed if we have the documentId
    if (documentId) {
      try {
        const supabase = supabaseService();
        await supabase
          .from("documents")
          .update({ status: "failed", error: e.message })
          .eq("id", documentId);
        console.log("Document marked as failed:", documentId);
      } catch (updateError) {
        console.error("Error updating document status:", updateError);
      }
    }

    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
