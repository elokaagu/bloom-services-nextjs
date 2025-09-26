import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function questionEmbedding(q: string) {
  try {
    console.log(
      "Generating question embedding for:",
      q.substring(0, 50) + "..."
    );
    const r = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: q,
    });
    console.log(
      "Question embedding generated successfully, dimension:",
      r.data[0].embedding.length
    );
    return r.data[0].embedding;
  } catch (error) {
    console.error("Error generating question embedding:", error);
    throw error;
  }
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
          answer:
            "I'm having trouble connecting to the database right now. Please check your database configuration and try again.",
          citations: [],
          error: "Database connection failed",
          details: testError.message,
        },
        { status: 200 } // Return 200 to show error message in chat
      );
    }

    console.log("Database connection successful");

    // Check if there are any documents in the workspace
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, status")
      .eq("workspace_id", workspaceId);

    if (docsError) {
      console.error("Error checking documents:", docsError);
      console.error("Workspace ID used:", workspaceId);
      return NextResponse.json({
        answer:
          "I'm having trouble accessing your documents. Please try again later.",
        citations: [],
        error: "Document access failed",
        details: docsError.message,
      });
    }

    console.log(`Found ${documents?.length || 0} documents in workspace`);
    console.log(
      "Documents:",
      documents?.map((d) => ({ id: d.id, title: d.title, status: d.status }))
    );

    // Check if this is a general conversation question (not document-related)
    const isGeneralQuestion =
      !question.toLowerCase().includes("document") &&
      !question.toLowerCase().includes("file") &&
      !question.toLowerCase().includes("upload") &&
      !question.toLowerCase().includes("pdf") &&
      !question.toLowerCase().includes("content") &&
      !question.toLowerCase().includes("search") &&
      !question.toLowerCase().includes("find") &&
      !question.toLowerCase().includes("what does") &&
      !question.toLowerCase().includes("tell me about") &&
      question.length < 50; // Short questions are likely general

    console.log("Is general question:", isGeneralQuestion);

    // If it's a general question or no documents exist, provide general conversation
    if (isGeneralQuestion || !documents || documents.length === 0) {
      console.log("Providing general conversation response");

      const generalPrompt = [
        {
          role: "system",
          content: `You are Bloom, an AI assistant for a knowledge management platform. You help users with their documents and can also have general conversations.

IMPORTANT RULES:
- Be helpful, friendly, and conversational
- If asked about documents but none exist, explain how to upload documents
- If asked about general topics, provide helpful responses
- Keep responses concise but informative
- Use a professional but approachable tone`,
        },
        {
          role: "user",
          content: question,
        },
      ] as any;

      const completion = await openai.chat.completions.create({
        model: process.env.GENERATION_MODEL || "gpt-4o-mini",
        messages: generalPrompt,
        temperature: 0.7,
        max_tokens: 500,
      });

      const answer =
        completion.choices[0]?.message?.content ||
        "I'm here to help! What would you like to know?";

      console.log("General conversation response generated");

      return NextResponse.json({
        answer,
        citations: [],
        isGeneralConversation: true,
        documentsFound: documents?.length || 0,
      });
    }

    // Check if any documents have chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select(
        `
        id, 
        document_id,
        documents!inner (
          id,
          workspace_id
        )
      `
      )
      .eq("documents.workspace_id", workspaceId)
      .limit(1);

    if (chunksError) {
      console.error("Error checking chunks:", chunksError);
    }

    console.log(`Found ${chunks?.length || 0} chunks in workspace`);

    if (!chunks || chunks.length === 0) {
      const readyDocs = documents.filter((d) => d.status === "ready");
      const processingDocs = documents.filter((d) => d.status === "processing");
      const failedDocs = documents.filter((d) => d.status === "failed");

      let message =
        "I can see your documents, but they haven't been processed yet for AI search. ";

      if (processingDocs.length > 0) {
        message += `I'm currently processing ${processingDocs.length} document(s). Please wait a moment and try again.`;
      } else if (failedDocs.length > 0) {
        message += `Some documents failed to process. You may want to try re-uploading them.`;
      } else {
        message +=
          "The documents need to be processed before I can answer questions about them. This usually happens automatically after upload.";
      }

      return NextResponse.json({
        answer: message,
        citations: [],
        documentsFound: documents.length,
        readyDocuments: readyDocs.length,
        processingDocuments: processingDocs.length,
        failedDocuments: failedDocs.length,
      });
    }

    // Log query
    const { data: qrow } = await supabase
      .from("queries")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        question,
        model: process.env.GENERATION_MODEL || "gpt-4o-mini",
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
    let retrievedChunks: any[] = [];

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

        retrievedChunks = fallbackChunks || [];
      } else {
        retrievedChunks = retrieved || [];
      }

      console.log("Retrieved", retrievedChunks.length, "chunks");
    } catch (retrievalError) {
      console.error("Chunk retrieval error:", retrievalError);

      // If chunk retrieval fails, provide a helpful error message
      return NextResponse.json({
        answer:
          "I'm having trouble accessing the document information right now. This might be because the documents are still being processed or there's a temporary issue. Please try again in a moment, or upload a new document if the problem persists.",
        citations: [],
        queryId: qrow?.id,
        error: "Chunk retrieval failed",
        details:
          retrievalError instanceof Error
            ? retrievalError.message
            : "Unknown error",
      });
    }

    if (retrievedChunks.length === 0) {
      console.log("No relevant chunks found for this question");

      // If no relevant chunks found, try to provide a general response
      const fallbackPrompt = [
        {
          role: "system",
          content: `You are Bloom, an AI assistant for a knowledge management platform. The user asked a question but no relevant information was found in their documents.

IMPORTANT RULES:
- Be helpful and acknowledge that you couldn't find relevant information in their documents
- Offer to help with general questions or suggest they check their document content
- Be friendly and conversational
- Keep responses concise`,
        },
        {
          role: "user",
          content: question,
        },
      ] as any;

      const fallbackCompletion = await openai.chat.completions.create({
        model: process.env.GENERATION_MODEL || "gpt-4o-mini",
        messages: fallbackPrompt,
        temperature: 0.7,
        max_tokens: 300,
      });

      const fallbackAnswer =
        fallbackCompletion.choices[0]?.message?.content ||
        "I couldn't find any relevant information in your documents to answer this question. Try asking about different topics or check if your documents contain the information you're looking for.";

      return NextResponse.json({
        answer: fallbackAnswer,
        citations: [],
        queryId: qrow?.id,
        chunksFound: 0,
        isGeneralConversation: true,
      });
    }

    // Build context from retrieved chunks
    const context = retrievedChunks
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
        content: `You are Bloom, an intelligent AI assistant for a knowledge management platform. You help users find information from their uploaded documents.

IMPORTANT RULES:
- Only answer based on the provided CONTEXT from the documents
- If the answer is not in the context, say "I don't have enough information in the uploaded documents to answer this question"
- Be conversational, helpful, and friendly
- Include [Source n] citations where n refers to the numbered sources
- If you reference specific information, always cite the source
- Use a professional but approachable tone`,
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

    console.log("Answer generated, length:", answer.length);

    // Create citations
    const citations = retrievedChunks.map((c, i) => ({
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
      chunksFound: retrievedChunks.length,
      documentsFound: documents.length,
    });
  } catch (e: any) {
    console.error("=== RAG CHAT API ERROR ===", e);
    return NextResponse.json(
      {
        answer:
          "I encountered an error while processing your question. Please try again.",
        citations: [],
        error: e.message,
      },
      { status: 200 }
    ); // Return 200 to show error in chat
  }
}
