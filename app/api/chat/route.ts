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
    console.log("=== RAG CHAT API START ===");

    const { workspaceId, userId, question } = await req.json();

    if (!workspaceId || !userId || !question) {
      console.error("Missing required fields:", {
        workspaceId,
        userId,
        question,
      });
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    console.log("Processing question:", question);
    console.log("Workspace:", workspaceId, "User:", userId);

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error - missing Supabase credentials" },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OpenAI API key");
      return NextResponse.json(
        { error: "Server configuration error - missing OpenAI API key" },
        { status: 500 }
      );
    }

    const supabase = supabaseService();

    // Test database connection first
    const { data: testData, error: testError } = await supabase
      .from("documents")
      .select("id")
      .limit(1);

    if (testError) {
      console.error("Database connection error:", testError);
      return NextResponse.json(
        { 
          error: "Database connection failed", 
          details: testError.message,
          suggestion: "Please check if the database schema has been set up correctly"
        },
        { status: 500 }
      );
    }

    console.log("Database connection successful");

    // Log query
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

    console.log("Query logged with ID:", qrow?.id);

    // Generate question embedding
    console.log("Generating question embedding");
    const qvec = await questionEmbedding(question);
    console.log("Question embedding generated, dimension:", qvec.length);

    const topK = Number(process.env.RAG_TOP_K || 6);
    console.log("Retrieving top", topK, "chunks");

    // Retrieve relevant chunks using vector similarity
    let chunks: any[] = [];

    try {
      // Try to use the RPC function first
      const { data: retrieved, error: rpcError } = await supabase.rpc(
        "match_chunks",
        {
          p_workspace_id: workspaceId,
          p_query_embedding: qvec,
          p_match_count: topK,
        }
      );

      if (rpcError) {
        console.log(
          "RPC function not available, using fallback:",
          rpcError.message
        );

        // Fallback: simple vector search
        const { data: fallbackChunks, error: fallbackError } = await supabase
          .from("document_chunks")
          .select(
            `
            id, 
            text, 
            document_id,
            documents!inner (
              id,
              title,
              workspace_id
            )
          `
          )
          .eq("documents.workspace_id", workspaceId)
          .limit(topK);

        if (fallbackError) {
          console.error("Fallback query error:", fallbackError);
          throw fallbackError;
        }

        chunks = fallbackChunks || [];
      } else {
        chunks = retrieved || [];
      }

      console.log("Retrieved", chunks.length, "chunks");
    } catch (retrievalError) {
      console.error("Chunk retrieval error:", retrievalError);
      throw retrievalError;
    }

    if (chunks.length === 0) {
      console.log("No relevant chunks found");
      return NextResponse.json({
        answer:
          "I don't have any relevant information in the uploaded documents to answer this question. Please make sure you have uploaded documents and they have been processed.",
        citations: [],
        queryId: qrow?.id,
      });
    }

    // Build context from retrieved chunks
    const context = chunks
      .map(
        (c, i) =>
          `# Source ${i + 1} (${c.documents?.title || "Unknown Document"})\n${
            c.text
          }`
      )
      .join("\n\n");

    console.log("Context built, length:", context.length);

    // Generate answer using OpenAI
    console.log("Generating answer with OpenAI");
    const prompt = [
      {
        role: "system",
        content: `You are Bloom's intelligent knowledge assistant. You help users find information from their uploaded documents. 

IMPORTANT RULES:
- Only answer based on the provided CONTEXT from the documents
- If the answer is not in the context, say "I don't have enough information in the uploaded documents to answer this question"
- Be concise but comprehensive
- Include [Source n] citations where n refers to the numbered sources
- If you reference specific information, always cite the source`,
      },
      {
        role: "user",
        content: `QUESTION: ${question}

CONTEXT FROM DOCUMENTS:
${context}

Please provide a helpful answer based on the context above. Include [Source n] citations for any information you reference.`,
      },
    ] as any;

    const completion = await openai.chat.completions.create({
      model: process.env.GENERATION_MODEL || "gpt-4o-mini",
      messages: prompt,
      temperature: 0.2,
      max_tokens: 1000,
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't generate an answer.";

    console.log("Answer generated, length:", answer.length);

    // Create citations
    const citations = chunks.map((c, i) => ({
      index: i + 1,
      chunkId: c.id,
      documentId: c.document_id,
      documentTitle: c.documents?.title || "Unknown Document",
      text: c.text.substring(0, 200) + (c.text.length > 200 ? "..." : ""),
    }));

    console.log("Citations created:", citations.length);
    console.log("=== RAG CHAT API SUCCESS ===");

    return NextResponse.json({
      answer,
      citations,
      queryId: qrow?.id,
      chunksFound: chunks.length,
    });
  } catch (e: any) {
    console.error("=== RAG CHAT API ERROR ===", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
