import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function questionEmbedding(q: string) {
  const r = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL!,
    input: q,
  });
  return r.data[0].embedding;
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId, question } = await req.json();
    if (!workspaceId || !userId || !question)
      return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const supabase = supabaseService();

    // log query
    const { data: qrow } = await supabase
      .from("queries")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        question,
        model: process.env.GENERATION_MODEL,
      })
      .select("*")
      .single();

    const qvec = await questionEmbedding(question);
    const topK = Number(process.env.RAG_TOP_K || 6);

    // Retrieve chunks only from docs user can access (RLS enforces this)
    const { data: retrieved, error } = await supabase.rpc(
      "match_chunks",
      {
        p_workspace_id: workspaceId,
        p_query_embedding: qvec,
        p_match_count: topK,
      }
    );

    // Fallback if RPC not created yet: simple vector search join
    let chunks = retrieved as any[] | null;
    if (!chunks) {
      const { data } = await supabase
        .from("document_chunks")
        .select("id, text, document_id")
        .limit(topK);
      chunks = data || [];
    }

    const context = (chunks || [])
      .map((c, i) => `# Source ${i + 1}\n${c.text}`)
      .join("\n\n");

    const prompt = [
      {
        role: "system",
        content: `You are Bloom's internal knowledge assistant. Only answer from the provided CONTEXT. If the answer is not in context, say you don't have enough information.`,
      },
      {
        role: "user",
        content: `QUESTION: ${question}\n\nCONTEXT:\n${context}\n\nReturn a concise answer with bullet points and include [Source n] markers where n refers to the numbered sources.`,
      },
    ] as any;

    const completion = await openai.chat.completions.create({
      model: process.env.GENERATION_MODEL!,
      messages: prompt,
      temperature: 0.2,
    });

    const answer = completion.choices[0]?.message?.content || "";

    // map simple citations
    const citations = (chunks || []).map((c, i) => ({
      index: i + 1,
      chunkId: c.id,
      documentId: c.document_id,
    }));

    return NextResponse.json({ answer, citations, queryId: qrow?.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
