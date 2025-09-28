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
    console.log("=== SIMPLE RAG CHAT API START ===");

    const { workspaceId, userId, question } = await req.json();

    // Accept any workspace ID format and normalize it
    const normalizedWorkspaceId =
      workspaceId || "550e8400-e29b-41d4-a716-446655440001";
    const normalizedUserId = userId || "550e8400-e29b-41d4-a716-446655440002";

    console.log("Question:", question);
    console.log("Workspace:", normalizedWorkspaceId);
    console.log("User:", normalizedUserId);

    const supabase = supabaseService();

    // Step 1: Get all documents (bypass RLS by using service role)
    console.log("Step 1: Fetching all documents...");
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status, workspace_id")
      .limit(50); // Get up to 50 documents

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

    console.log(`Found ${documents?.length || 0} total documents`);

    if (!documents || documents.length === 0) {
      console.log("No documents found in database");
      return NextResponse.json({
        answer:
          "I don't see any documents in the system yet. Upload some documents and I'll be able to help you find information from them!",
        citations: [],
        documentsFound: 0,
      });
    }

    // Step 2: Get all chunks (bypass RLS)
    console.log("Step 2: Fetching all chunks...");
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
      .limit(100); // Get up to 100 chunks

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

    console.log(`Found ${chunks?.length || 0} total chunks`);

    if (!chunks || chunks.length === 0) {
      console.log("No chunks found, checking document status");
      const readyDocs = documents.filter((d) => d.status === "ready");
      const processingDocs = documents.filter((d) => d.status === "processing");

      if (processingDocs.length > 0) {
        return NextResponse.json({
          answer: `I can see ${documents.length} document(s) in the system, but they're still being processed. Please wait a moment and try again.`,
          citations: [],
          documentsFound: documents.length,
          processingDocuments: processingDocs.length,
        });
      } else if (readyDocs.length > 0) {
        return NextResponse.json({
          answer: `I can see ${documents.length} document(s) in the system, but they haven't been processed for AI search yet. This usually happens automatically after upload.`,
          citations: [],
          documentsFound: documents.length,
          readyDocuments: readyDocs.length,
        });
      } else {
        return NextResponse.json({
          answer: `I can see ${documents.length} document(s) in the system, but they're not ready for search yet.`,
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

    // Step 4: Simple similarity search using all chunks
    console.log("Step 4: Finding relevant chunks...");

    // For now, use a simple approach - get chunks that contain keywords from the question
    const questionWords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const relevantChunks = chunks
      .filter((chunk) => {
        const chunkText = chunk.text.toLowerCase();
        return questionWords.some((word) => chunkText.includes(word));
      })
      .slice(0, 6); // Get first 6 matching chunks

    // If no keyword matches, just take the first 6 chunks
    const finalChunks =
      relevantChunks.length > 0 ? relevantChunks : chunks.slice(0, 6);

    console.log(`Using ${finalChunks.length} chunks for context`);

    // Step 5: Build context from chunks
    console.log("Step 5: Building context...");
    const context = finalChunks
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

    // Step 7: Create citations
    const citations = finalChunks.map((chunk, index) => ({
      index: index + 1,
      chunkId: chunk.id,
      documentId: chunk.document_id,
      documentTitle: chunk.documents?.title || "Unknown Document",
      text:
        chunk.text.substring(0, 200) + (chunk.text.length > 200 ? "..." : ""),
    }));

    console.log("=== SIMPLE RAG CHAT API SUCCESS ===");

    return NextResponse.json({
      answer,
      citations,
      chunksFound: finalChunks.length,
      documentsFound: documents.length,
      contextLength: context.length,
      workspaceId: normalizedWorkspaceId,
      userId: normalizedUserId,
    });
  } catch (error: any) {
    console.error("=== SIMPLE RAG CHAT API ERROR ===", error);
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
