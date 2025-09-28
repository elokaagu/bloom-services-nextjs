import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateQuestionEmbedding(question: string) {
  try {
    console.log("Generating question embedding...");
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: question,
    });
    console.log("Question embedding generated successfully");
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating question embedding:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== IMPROVED RAG CHAT API START ===");

    const { workspaceId, userId, question } = await req.json();

    // Accept any workspace ID format and normalize it
    const normalizedWorkspaceId =
      workspaceId || "550e8400-e29b-41d4-a716-446655440001";
    const normalizedUserId = userId || "550e8400-e29b-41d4-a716-446655440002";

    console.log("Question:", question);
    console.log("Workspace:", normalizedWorkspaceId);
    console.log("User:", normalizedUserId);

    const supabase = supabaseService();

    // Step 1: Generate question embedding
    console.log("Step 1: Generating question embedding...");
    let questionEmbedding;
    try {
      questionEmbedding = await generateQuestionEmbedding(question);
    } catch (error) {
      console.error("Failed to generate question embedding:", error);
      return NextResponse.json({
        answer:
          "I'm having trouble processing your question. Please try again later.",
        citations: [],
        error: "Embedding generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Step 2: Use vector similarity search to find relevant chunks
    console.log("Step 2: Performing vector similarity search...");

    // Use the match_chunks function for efficient vector search
    const { data: similarChunks, error: searchError } = await supabase.rpc(
      "match_chunks",
      {
        p_workspace_id: normalizedWorkspaceId,
        p_query_embedding: questionEmbedding,
        p_match_count: 8, // Get top 8 most relevant chunks
      }
    );

    if (searchError) {
      console.error("Vector search error:", searchError);

      // Fallback to manual vector search if RPC function fails
      console.log("Falling back to manual vector search...");
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from("document_chunks")
        .select(
          `
          id,
          document_id,
          text,
          embedding,
          documents!inner (
            id,
            title,
            workspace_id
          )
        `
        )
        .not("embedding", "is", null)
        .eq("documents.workspace_id", normalizedWorkspaceId)
        .limit(50); // Increased limit for fallback

      if (fallbackError) {
        console.error("Fallback search also failed:", fallbackError);
        return NextResponse.json({
          answer:
            "I'm having trouble searching through your documents. Please try again later.",
          citations: [],
          error: "Search error",
          details: fallbackError.message,
        });
      }

      if (!fallbackChunks || fallbackChunks.length === 0) {
        console.log("No chunks with embeddings found in workspace");
        return NextResponse.json({
          answer:
            "I don't see any processed documents in your workspace yet. Upload some documents and wait for them to be processed, then I'll be able to help you find information from them!",
          citations: [],
          chunksFound: 0,
          error: "No processed documents found",
        });
      }

      // Manual similarity calculation for fallback
      const chunksWithSimilarity =
        fallbackChunks
          ?.map((chunk) => {
            if (!chunk.embedding) return { ...chunk, similarity: 0 };

            // Calculate cosine similarity
            const dotProduct = chunk.embedding.reduce(
              (sum, val, i) => sum + val * questionEmbedding[i],
              0
            );
            const magnitudeA = Math.sqrt(
              chunk.embedding.reduce((sum, val) => sum + val * val, 0)
            );
            const magnitudeB = Math.sqrt(
              questionEmbedding.reduce((sum, val) => sum + val * val, 0)
            );
            const similarity = dotProduct / (magnitudeA * magnitudeB);

            return { ...chunk, similarity };
          })
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 8) || [];

      console.log(
        `Found ${chunksWithSimilarity.length} relevant chunks via fallback`
      );

      if (chunksWithSimilarity.length === 0) {
        return NextResponse.json({
          answer:
            "I couldn't find any relevant information in your documents to answer this question. Try asking about something else or upload more documents.",
          citations: [],
          chunksFound: 0,
        });
      }

      // Use fallback results
      const finalChunks = chunksWithSimilarity;
      const context = finalChunks
        .map((chunk, index) => {
          const docTitle = chunk.documents?.title || "Unknown Document";
          return `[Source ${index + 1} - ${docTitle}]\n${chunk.text}`;
        })
        .join("\n\n");

      // Generate answer using OpenAI
      console.log("Step 3: Generating answer...");
      const prompt = [
        {
          role: "system",
          content: `You are Bloom, an AI assistant for a knowledge management platform. You help users find information from their uploaded documents.

IMPORTANT RULES:
- Only answer based on the provided CONTEXT from the documents
- If the answer is not in the context, say "I don't have enough information in the uploaded documents to answer this question"
- Be conversational, helpful, and friendly
- Include [Source n] citations where n refers to the numbered sources
- If you reference specific information, always cite the source
- Use a professional but approachable tone
- If the question is very general or unclear, provide a helpful response about what you can help with`,
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
        temperature: 0.3,
        max_tokens: 1000,
      });

      const answer =
        completion.choices[0]?.message?.content ||
        "I couldn't generate an answer.";

      // Create citations
      const citations = finalChunks.map((chunk, index) => ({
        index: index + 1,
        chunkId: chunk.id,
        documentId: chunk.document_id,
        documentTitle: chunk.documents?.title || "Unknown Document",
        text:
          chunk.text.substring(0, 200) + (chunk.text.length > 200 ? "..." : ""),
        relevanceScore: chunk.similarity || 0,
      }));

      console.log("=== IMPROVED RAG CHAT API SUCCESS (FALLBACK) ===");

      return NextResponse.json({
        answer,
        citations,
        chunksFound: finalChunks.length,
        contextLength: context.length,
        workspaceId: normalizedWorkspaceId,
        userId: normalizedUserId,
        searchMethod: "fallback_vector_search",
      });
    }

    console.log(
      `Found ${similarChunks?.length || 0} relevant chunks via vector search`
    );

    if (!similarChunks || similarChunks.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find any relevant information in your documents to answer this question. Try asking about something else or upload more documents.",
        citations: [],
        chunksFound: 0,
      });
    }

    // Step 3: Build context from most relevant chunks
    console.log("Step 3: Building context from relevant chunks...");
    const context = similarChunks
      .map((chunk, index) => {
        // Get document title for each chunk
        const docTitle = `Document ${chunk.document_id}`; // We'll need to fetch this separately
        return `[Source ${index + 1} - ${docTitle}]\n${chunk.text}`;
      })
      .join("\n\n");

    console.log(`Context built: ${context.length} characters`);

    // Step 4: Get document titles for better citations
    const documentIds = [
      ...new Set(similarChunks.map((chunk) => chunk.document_id)),
    ];
    const { data: documents } = await supabase
      .from("documents")
      .select("id, title")
      .in("id", documentIds);

    const documentTitles =
      documents?.reduce((acc, doc) => {
        acc[doc.id] = doc.title;
        return acc;
      }, {} as Record<string, string>) || {};

    // Step 5: Generate answer using OpenAI
    console.log("Step 4: Generating answer...");
    const prompt = [
      {
        role: "system",
        content: `You are Bloom, an AI assistant for a knowledge management platform. You help users find information from their uploaded documents.

IMPORTANT RULES:
- Only answer based on the provided CONTEXT from the documents
- If the answer is not in the context, say "I don't have enough information in the uploaded documents to answer this question"
- Be conversational, helpful, and friendly
- Include [Source n] citations where n refers to the numbered sources
- If you reference specific information, always cite the source
- Use a professional but approachable tone
- If the question is very general or unclear, provide a helpful response about what you can help with`,
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
      temperature: 0.3,
      max_tokens: 1000,
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't generate an answer.";

    // Step 6: Create citations with document titles
    const citations = similarChunks.map((chunk, index) => ({
      index: index + 1,
      chunkId: chunk.id,
      documentId: chunk.document_id,
      documentTitle: documentTitles[chunk.document_id] || "Unknown Document",
      text:
        chunk.text.substring(0, 200) + (chunk.text.length > 200 ? "..." : ""),
      relevanceScore: chunk.similarity || 0,
    }));

    console.log("=== IMPROVED RAG CHAT API SUCCESS ===");

    return NextResponse.json({
      answer,
      citations,
      chunksFound: similarChunks.length,
      contextLength: context.length,
      workspaceId: normalizedWorkspaceId,
      userId: normalizedUserId,
      searchMethod: "vector_similarity_search",
    });
  } catch (error: any) {
    console.error("=== IMPROVED RAG CHAT API ERROR ===", error);
    return NextResponse.json(
      {
        answer:
          "I encountered an error while processing your question. Please try again.",
        citations: [],
        error: error.message,
        stack: error.stack,
      },
      { status: 200 }
    ); // Return 200 to show error in chat
  }
}
