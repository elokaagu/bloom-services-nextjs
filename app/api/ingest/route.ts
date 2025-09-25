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
    const { documentId } = await req.json();
    if (!documentId)
      return NextResponse.json(
        { error: "documentId required" },
        { status: 400 }
      );

    const supabase = supabaseService();

    // load doc
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docErr) throw docErr;

    // update status
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    const buf = await fetchFileBuffer(doc.storage_path);

    // parse by filetype
    let text = "";
    if (doc.title.endsWith(".pdf")) {
      const pdf = (await import("pdf-parse")).default;
      const parsed = await pdf(buf);
      text = parsed.text;
    } else if (doc.title.endsWith(".docx")) {
      const parsed = await mammoth.extractRawText({ buffer: buf });
      text = parsed.value;
    } else {
      text = buf.toString("utf8");
    }

    text = text.replace(/\s+/g, " ").trim();
    const chunks = simpleChunk(text);
    const embeddings = await embed(chunks.map((c) => c.text));

    // insert chunks
    const rows = chunks.map((c, i) => ({
      document_id: documentId,
      chunk_no: c.chunk_no,
      text: c.text,
      embedding: embeddings[i] as any,
    }));

    const { error: insErr } = await supabase
      .from("document_chunks")
      .insert(rows);
    if (insErr) throw insErr;

    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", documentId);
    return NextResponse.json({ ok: true, chunks: rows.length });
  } catch (e: any) {
    console.error(e);
    if (req.body) {
      // mark failed if possible
      try {
        const { documentId } = await req.json();
        if (documentId) {
          const supabase = supabaseService();
          await supabase
            .from("documents")
            .update({ status: "failed", error: e.message })
            .eq("id", documentId);
        }
      } catch {}
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
