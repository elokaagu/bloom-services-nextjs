import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("=== FIX STORAGE PATHS API START ===");

    const supabase = supabaseService();

    // Get all documents with storage_path that starts with "documents/"
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, storage_path")
      .like("storage_path", "documents/%");

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: `Failed to fetch documents: ${docsError.message}` },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      console.log("No documents found with 'documents/' prefix");
      return NextResponse.json({
        success: true,
        message: "No documents found with 'documents/' prefix",
        fixed: 0,
        total: 0,
      });
    }

    console.log(`Found ${documents.length} documents with 'documents/' prefix`);

    const results = [];
    let successCount = 0;

    for (const doc of documents) {
      try {
        // Remove the "documents/" prefix from storage_path
        const newPath = doc.storage_path.replace(/^documents\//, "");
        
        console.log(`Fixing document: ${doc.title}`);
        console.log(`  Old path: ${doc.storage_path}`);
        console.log(`  New path: ${newPath}`);

        // Update the document with the new path
        const { error: updateError } = await supabase
          .from("documents")
          .update({ storage_path: newPath })
          .eq("id", doc.id);

        if (updateError) {
          console.error(`Error updating document ${doc.id}:`, updateError);
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: false,
            error: updateError.message,
            oldPath: doc.storage_path,
            newPath: newPath,
          });
        } else {
          console.log(`Successfully updated document: ${doc.title}`);
          results.push({
            documentId: doc.id,
            title: doc.title,
            success: true,
            oldPath: doc.storage_path,
            newPath: newPath,
          });
          successCount++;
        }
      } catch (error: any) {
        console.error(`Error processing document ${doc.id}:`, error);
        results.push({
          documentId: doc.id,
          title: doc.title,
          success: false,
          error: error.message,
          oldPath: doc.storage_path,
        });
      }
    }

    console.log(`Migration complete: ${successCount}/${documents.length} documents fixed`);
    console.log("=== FIX STORAGE PATHS API SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: `Fixed ${successCount} out of ${documents.length} documents`,
      fixed: successCount,
      total: documents.length,
      results: results,
    });
  } catch (error: any) {
    console.error("=== FIX STORAGE PATHS API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log("=== CHECK STORAGE PATHS API START ===");

    const supabase = supabaseService();

    // Get all documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, title, storage_path, status");

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return NextResponse.json(
        { error: `Failed to fetch documents: ${docsError.message}` },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No documents found",
        total: 0,
        needsFixing: 0,
        documents: [],
      });
    }

    // Check which documents need fixing
    const needsFixing = documents.filter(doc => 
      doc.storage_path && doc.storage_path.startsWith("documents/")
    );

    console.log(`Found ${documents.length} total documents`);
    console.log(`${needsFixing.length} documents need path fixing`);

    return NextResponse.json({
      success: true,
      total: documents.length,
      needsFixing: needsFixing.length,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        storagePath: doc.storage_path,
        status: doc.status,
        needsFixing: doc.storage_path?.startsWith("documents/") || false,
      })),
    });
  } catch (error: any) {
    console.error("=== CHECK STORAGE PATHS API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
