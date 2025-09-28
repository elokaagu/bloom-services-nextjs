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
    console.log("=== ROBUST RAG CHAT API START ===");

    const { workspaceId, userId, question } = await req.json();

    // Accept any workspace ID format and normalize it
    const normalizedWorkspaceId =
      workspaceId || "550e8400-e29b-41d4-a716-446655440001";
    const normalizedUserId = userId || "550e8400-e29b-41d4-a716-446655440002";

    console.log("Question:", question);
    console.log("Workspace:", normalizedWorkspaceId);
    console.log("User:", normalizedUserId);

    const supabase = supabaseService();

    // Step 1: Check if we have any documents in the workspace
    console.log("Step 1: Checking for documents in workspace...");
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status, workspace_id")
      .eq("workspace_id", normalizedWorkspaceId)
      .limit(10);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json({
        answer:
          "I'm having trouble accessing the document database. Please try again later.",
        citations: [],
        error: "Database error",
        details: docsError.message,
      });
    }

    console.log(`Found ${documents?.length || 0} documents in workspace`);

    if (!documents || documents.length === 0) {
      console.log("No documents found in workspace");
      return NextResponse.json({
        answer:
          "I don't see any documents in this workspace yet. Upload some documents and I'll be able to help you find information from them!",
        citations: [],
        documentsFound: 0,
      });
    }

    // Step 2: Check if we have any chunks with embeddings
    console.log("Step 2: Checking for chunks with embeddings...");
    const { data: chunks, error: chunksError } = await supabase
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
      .limit(20);

    if (chunksError) {
      console.error("Error fetching chunks:", chunksError);
      return NextResponse.json({
        answer:
          "I'm having trouble accessing document content. Please try again later.",
        citations: [],
        error: "Chunk retrieval error",
        details: chunksError.message,
      });
    }

    console.log(`Found ${chunks?.length || 0} chunks with embeddings`);

    if (!chunks || chunks.length === 0) {
      console.log("No chunks with embeddings found");
      const readyDocs = documents.filter((d) => d.status === "ready");
      const processingDocs = documents.filter((d) => d.status === "processing");

      if (processingDocs.length > 0) {
        return NextResponse.json({
          answer: `I can see ${documents.length} document(s) in your workspace, but they're still being processed. Please wait a moment and try again.`,
          citations: [],
          documentsFound: documents.length,
          processingDocuments: processingDocs.length,
        });
      } else if (readyDocs.length > 0) {
        return NextResponse.json({
          answer: `I can see ${documents.length} document(s) in your workspace, but they haven't been processed for AI search yet. This usually happens automatically after upload.`,
          citations: [],
          documentsFound: documents.length,
          readyDocuments: readyDocs.length,
        });
      } else {
        return NextResponse.json({
          answer: `I can see ${documents.length} document(s) in your workspace, but they're not ready for search yet.`,
          citations: [],
          documentsFound: documents.length,
        });
      }
    }

    // Step 3: Generate question embedding
    console.log("Step 3: Generating question embedding...");
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

    // Step 4: Try vector similarity search (with fallback)
    console.log("Step 4: Performing vector similarity search...");
    let relevantChunks = [];
    let searchMethod = "none";

    // Determine similarity threshold based on question type
    const isSpecificQuestion =
      question.length > 10 &&
      (question.toLowerCase().includes("what") ||
        question.toLowerCase().includes("how") ||
        question.toLowerCase().includes("why") ||
        question.toLowerCase().includes("when") ||
        question.toLowerCase().includes("where") ||
        question.toLowerCase().includes("who") ||
        question.toLowerCase().includes("which") ||
        question.toLowerCase().includes("explain") ||
        question.toLowerCase().includes("describe") ||
        question.toLowerCase().includes("tell me about"));

    const similarityThreshold = isSpecificQuestion ? 0.3 : 0.15; // Lower threshold for general conversation
    console.log(
      `Using similarity threshold: ${similarityThreshold} (specific: ${isSpecificQuestion})`
    );

    // Try RPC function first
    try {
      const { data: rpcChunks, error: rpcError } = await supabase.rpc(
        "match_chunks",
        {
          p_workspace_id: normalizedWorkspaceId,
          p_query_embedding: questionEmbedding,
          p_match_count: 4,
        }
      );

      if (!rpcError && rpcChunks && rpcChunks.length > 0) {
        console.log(`Found ${rpcChunks.length} chunks via RPC function`);
        relevantChunks = rpcChunks;
        searchMethod = "rpc_vector_search";
      } else {
        console.log("RPC function failed or returned no results:", rpcError);
        throw new Error("RPC function not available");
      }
    } catch (rpcError) {
      console.log("RPC function not available, using manual vector search");

      // Manual vector similarity calculation
      const chunksWithSimilarity = chunks
        .map((chunk) => {
          if (!chunk.embedding) return { ...chunk, similarity: 0 };

          // Handle embedding data type - could be array or string
          let embeddingArray;
          if (Array.isArray(chunk.embedding)) {
            embeddingArray = chunk.embedding;
          } else if (typeof chunk.embedding === "string") {
            try {
              embeddingArray = JSON.parse(chunk.embedding);
            } catch (e) {
              console.error("Failed to parse embedding string:", e);
              return { ...chunk, similarity: 0 };
            }
          } else {
            console.error("Unknown embedding type:", typeof chunk.embedding);
            return { ...chunk, similarity: 0 };
          }

          if (!Array.isArray(embeddingArray)) {
            console.error("Embedding is not an array after parsing");
            return { ...chunk, similarity: 0 };
          }

          // Calculate cosine similarity
          const dotProduct = embeddingArray.reduce(
            (sum, val, i) => sum + val * questionEmbedding[i],
            0
          );
          const magnitudeA = Math.sqrt(
            embeddingArray.reduce((sum, val) => sum + val * val, 0)
          );
          const magnitudeB = Math.sqrt(
            questionEmbedding.reduce((sum, val) => sum + val * val, 0)
          );
          const similarity = dotProduct / (magnitudeA * magnitudeB);

          return { ...chunk, similarity };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .filter((chunk) => chunk.similarity > similarityThreshold) // Dynamic threshold based on question type
        .slice(0, 4); // Reduce to top 4 most relevant chunks

      console.log(
        `Found ${chunksWithSimilarity.length} chunks via manual search`
      );

      // Log similarity scores for debugging
      chunksWithSimilarity.forEach((chunk, index) => {
        console.log(
          `Chunk ${index + 1}: similarity=${chunk.similarity.toFixed(3)}, doc=${
            chunk.documents?.title
          }`
        );
      });

      relevantChunks = chunksWithSimilarity;
      searchMethod = "manual_vector_search";
    }

    if (relevantChunks.length === 0) {
      // For very short questions, provide a helpful response
      if (question.length <= 5) {
        return NextResponse.json({
          answer:
            "Hello! I'm here to help you find information from your documents. You can ask me questions like 'What is Bloom?' or 'Tell me about your services' and I'll search through your uploaded documents to provide relevant answers.",
          citations: [],
          chunksFound: 0,
          isGeneralResponse: true,
        });
      }

      return NextResponse.json({
        answer:
          "I couldn't find any relevant information in your documents to answer this question. Try asking about something else or upload more documents.",
        citations: [],
        chunksFound: 0,
      });
    }

    // Step 5: Build context from relevant chunks
    console.log("Step 5: Building context from relevant chunks...");
    const context = relevantChunks
      .map((chunk, index) => {
        const docTitle = chunk.documents?.title || "Unknown Document";
        return `[Source ${index + 1} - ${docTitle}]\n${chunk.text}`;
      })
      .join("\n\n");

    console.log(`Context built: ${context.length} characters`);

    // Step 6: Generate answer using OpenAI
    console.log("Step 6: Generating answer...");
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

    // Step 7: Create citations (only for chunks actually used and with appropriate relevance)
    console.log("Creating citations from relevant chunks...");
    console.log("Relevant chunks sample:", relevantChunks.slice(0, 2).map(chunk => ({
      id: chunk.id,
      document_id: chunk.document_id,
      title: chunk.documents?.title,
      similarity: chunk.similarity
    })));
    
    const citations = relevantChunks
      .filter((chunk) => chunk.similarity > similarityThreshold) // Use dynamic threshold
      .map((chunk, index) => {
        console.log(`Creating citation ${index}:`, {
          chunkId: chunk.id,
          documentId: chunk.document_id,
          title: chunk.documents?.title
        });
        
        return {
          id: `citation-${chunk.document_id}-${index}`,
          documentId: chunk.document_id,
          documentTitle: chunk.documents?.title || "Unknown Document",
          snippet:
            chunk.text.substring(0, 200) + (chunk.text.length > 200 ? "..." : ""),
          relevanceScore: chunk.similarity || 0,
        };
      });

    // Log final citations for debugging
    console.log(
      "Final citations:",
      citations.map(
        (c) => `${c.documentTitle} (${c.relevanceScore.toFixed(3)}) - ID: ${c.documentId}`
      )
    );

    console.log("=== ROBUST RAG CHAT API SUCCESS ===");

    return NextResponse.json({
      answer,
      citations,
      chunksFound: relevantChunks.length,
      documentsFound: documents.length,
      contextLength: context.length,
      workspaceId: normalizedWorkspaceId,
      userId: normalizedUserId,
      searchMethod,
    });
  } catch (error: any) {
    console.error("=== ROBUST RAG CHAT API ERROR ===", error);
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
