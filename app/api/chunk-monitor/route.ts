import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    console.log("=== CHUNK CREATION MONITOR START ===");
    
    const supabase = supabaseService();
    
    // Get all documents with their chunk status
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select(`
        *,
        document_chunks(count)
      `)
      .order("created_at", { ascending: false });
    
    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json({ 
        error: "Failed to fetch documents",
        details: docsError.message 
      }, { status: 500 });
    }
    
    console.log(`Found ${documents?.length || 0} documents`);
    
    // Analyze each document
    const analysis = documents?.map(doc => {
      const chunkCount = doc.document_chunks?.[0]?.count || 0;
      const hasChunks = chunkCount > 0;
      
      return {
        id: doc.id,
        title: doc.title,
        status: doc.status,
        storagePath: doc.storage_path,
        createdAt: doc.created_at,
        chunkCount: chunkCount,
        hasChunks: hasChunks,
        needsProcessing: doc.status === "ready" && !hasChunks,
        canProcess: doc.status === "ready" && doc.storage_path && !hasChunks
      };
    }) || [];
    
    // Summary statistics
    const summary = {
      totalDocuments: analysis.length,
      readyDocuments: analysis.filter(d => d.status === "ready").length,
      documentsWithChunks: analysis.filter(d => d.hasChunks).length,
      documentsNeedingProcessing: analysis.filter(d => d.needsProcessing).length,
      documentsCanProcess: analysis.filter(d => d.canProcess).length,
      processingDocuments: analysis.filter(d => d.status === "processing").length,
      failedDocuments: analysis.filter(d => d.status === "failed").length,
      uploadingDocuments: analysis.filter(d => d.status === "uploading").length
    };
    
    console.log("Analysis complete:", summary);
    
    return NextResponse.json({
      success: true,
      summary: summary,
      documents: analysis,
      recommendations: {
        canProcessNow: analysis.filter(d => d.canProcess).length > 0,
        needsAttention: analysis.filter(d => d.status === "failed").length > 0,
        processingInProgress: analysis.filter(d => d.status === "processing").length > 0
      }
    });
    
  } catch (error: any) {
    console.error("=== CHUNK CREATION MONITOR ERROR ===", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
