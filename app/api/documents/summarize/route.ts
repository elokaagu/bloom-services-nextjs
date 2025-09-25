import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    console.log("=== DOCUMENT SUMMARIZE API START ===");
    
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    console.log("Summarizing document:", documentId);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (docError) {
      console.error("Database fetch error:", docError);
      return NextResponse.json(
        { error: `Database error: ${docError.message}` },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get file content from storage
    let fileContent = "";
    try {
      const { data: fileData, error: fileError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || "documents")
        .download(document.storage_path);

      if (fileError) {
        console.error("Storage fetch error:", fileError);
        return NextResponse.json(
          { error: `Storage error: ${fileError.message}` },
          { status: 500 }
        );
      }

      // Parse file content based on file type
      const buffer = Buffer.from(await fileData.arrayBuffer());
      
      if (document.title.endsWith(".pdf")) {
        const pdf = (await import("pdf-parse")).default;
        const parsed = await pdf(buffer);
        fileContent = parsed.text;
      } else if (document.title.endsWith(".docx")) {
        const mammoth = (await import("mammoth")).default;
        const parsed = await mammoth.extractRawText({ buffer });
        fileContent = parsed.value;
      } else if (document.title.endsWith(".txt")) {
        fileContent = buffer.toString("utf8");
      } else {
        // For other file types, try to extract text
        fileContent = buffer.toString("utf8");
      }

      // Clean up the text
      fileContent = fileContent.replace(/\s+/g, " ").trim();
      
      if (fileContent.length === 0) {
        return NextResponse.json(
          { error: "No text content found in document" },
          { status: 400 }
        );
      }

    } catch (parseError) {
      console.error("File parsing error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse document content" },
        { status: 500 }
      );
    }

    // Generate summary using OpenAI
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.GENERATION_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates concise summaries of documents. Create a clear, informative summary in 2-3 sentences that captures the main points of the document."
          },
          {
            role: "user",
            content: `Please summarize this document:\n\n${fileContent.substring(0, 4000)}` // Limit to first 4000 chars to stay within token limits
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const summary = completion.choices[0]?.message?.content || "Unable to generate summary";

      // Update document with summary
      const { error: updateError } = await supabase
        .from("documents")
        .update({ 
          summary: summary,
          summary_updated_at: new Date().toISOString()
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Database update error:", updateError);
        // Don't fail the request if we can't save the summary
      }

      console.log("Document summarized successfully:", documentId);
      console.log("=== DOCUMENT SUMMARIZE API SUCCESS ===");

      return NextResponse.json({
        success: true,
        summary: summary,
        documentId: documentId,
      });

    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("=== DOCUMENT SUMMARIZE API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
