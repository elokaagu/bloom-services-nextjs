import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== MANUAL INGESTION TRIGGER START ===");
    
    const supabase = supabaseService();
    
    // Get the first ready document that doesn't have chunks
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "ready")
      .not("storage_path", "is", null)
      .limit(1);
    
    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json({ 
        error: "No ready documents found",
        details: docsError?.message 
      }, { status: 404 });
    }
    
    const document = documents[0];
    console.log("Found document to process:", document.title);
    
    // Check if document already has chunks
    const { data: existingChunks } = await supabase
      .from("document_chunks")
      .select("id")
      .eq("document_id", document.id)
      .limit(1);
    
    if (existingChunks && existingChunks.length > 0) {
      console.log("Document already has chunks, skipping");
      return NextResponse.json({
        success: true,
        message: "Document already has chunks",
        documentId: document.id,
        title: document.title,
        chunksCount: existingChunks.length
      });
    }
    
    // Trigger the existing ingestion API
    console.log("Triggering ingestion for document:", document.id);
    
    const ingestResponse = await fetch(`${req.nextUrl.origin}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });
    
    if (ingestResponse.ok) {
      const ingestResult = await ingestResponse.json();
      console.log("Ingestion completed:", ingestResult);
      
      return NextResponse.json({
        success: true,
        message: "Document ingestion triggered successfully",
        documentId: document.id,
        title: document.title,
        result: ingestResult
      });
    } else {
      const errorText = await ingestResponse.text();
      console.error("Ingestion failed:", errorText);
      
      return NextResponse.json({
        success: false,
        message: "Document ingestion failed",
        documentId: document.id,
        title: document.title,
        error: errorText
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("=== MANUAL INGESTION TRIGGER ERROR ===", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
