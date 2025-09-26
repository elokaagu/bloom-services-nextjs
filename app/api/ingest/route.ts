import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";
import mammoth from "mammoth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VECTOR_DIM = Number(process.env.VECTOR_DIM || 1536);

async function fetchFileBuffer(path: string) {
  const supabase = supabaseService();
  const { data, error } = await supabase.storage
    .from(process.env.STORAGE_BUCKET!)
    .download(path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

function simpleChunk(text: string, size = 1200, overlap = 200) {
  const chunks: { text: string; chunk_no: number }[] = [];
  for (let i = 0, c = 0; i < text.length; i += size - overlap) {
    chunks.push({ text: text.slice(i, i + size), chunk_no: c++ });
  }
  return chunks;
}

async function embed(texts: string[]) {
  const res = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL!,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== DOCUMENT INGESTION START ===");
    
    const { documentId } = await req.json();
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
      console.log("Fetching file from storage:", doc.storage_path);
      
      const { data: fileData, error: fileError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .download(doc.storage_path);

      if (fileError) {
        console.error("Storage error:", fileError);
        throw fileError;
      }

      const buf = Buffer.from(await fileData.arrayBuffer());
      console.log("File buffer created, size:", buf.length);

      // Parse by file type
      if (doc.title.endsWith(".pdf")) {
        console.log("Parsing PDF file");
        const pdf = (await import("pdf-parse")).default;
        const parsed = await pdf(buf);
        text = parsed.text;
        console.log("PDF parsed, text length:", text.length);
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
      documentId: documentId 
    });

  } catch (e: any) {
    console.error("=== DOCUMENT INGESTION ERROR ===", e);
    
    // Mark document as failed if possible
    try {
      const { documentId } = await req.json();
      if (documentId) {
        const supabase = supabaseService();
        await supabase
          .from("documents")
          .update({ status: "failed", error: e.message })
          .eq("id", documentId);
      }
    } catch (updateError) {
      console.error("Error updating document status:", updateError);
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
