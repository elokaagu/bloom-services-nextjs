import { NextRequest, NextResponse } from "next/server";

// Temporary in-memory storage for documents (until Supabase is fixed)
let documentsStore: any[] = [
  {
    id: "doc-1",
    title: "Data Retention Policy 2024.pdf",
    status: "ready",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    workspace_id: "default-workspace",
    owner_id: "user-1",
    storage_path: "documents/data-retention-policy.pdf",
    acl: "organization",
    error: null
  },
  {
    id: "doc-2", 
    title: "GDPR Compliance Guide.docx",
    status: "ready",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    workspace_id: "default-workspace",
    owner_id: "user-2",
    storage_path: "documents/gdpr-guide.docx",
    acl: "workspace",
    error: null
  },
  {
    id: "doc-3",
    title: "Security Best Practices.pdf", 
    status: "ready",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    workspace_id: "default-workspace",
    owner_id: "user-3",
    storage_path: "documents/security-practices.pdf",
    acl: "workspace",
    error: null
  },
  {
    id: "doc-4",
    title: "Employee Handbook 2024.docx",
    status: "processing",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    workspace_id: "default-workspace",
    owner_id: "user-1",
    storage_path: "documents/employee-handbook.docx",
    acl: "organization",
    error: null
  },
  {
    id: "doc-5",
    title: "Marketing Strategy Presentation.pptx",
    status: "uploading",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    workspace_id: "default-workspace",
    owner_id: "user-2",
    storage_path: "documents/marketing-strategy.pptx",
    acl: "workspace",
    error: null
  },
  {
    id: "doc-6",
    title: "Failed Upload Document.pdf",
    status: "failed",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    workspace_id: "default-workspace",
    owner_id: "user-4",
    storage_path: "documents/failed-upload.pdf",
    acl: "workspace",
    error: "Upload failed due to network timeout"
  }
];

export async function GET(req: NextRequest) {
  try {
    console.log("=== FETCH DOCUMENTS API START (LOCAL STORE) ===");
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "default-workspace";
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    console.log("Query parameters:", { workspaceId, status, search });

    // Filter documents
    let filteredDocuments = documentsStore.filter(doc => doc.workspace_id === workspaceId);

    // Add status filter if provided
    if (status && status !== "all") {
      filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
    }

    // Add search filter if provided
    if (search) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by created_at descending
    filteredDocuments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`Found ${filteredDocuments.length} documents`);
    console.log("=== FETCH DOCUMENTS API SUCCESS (LOCAL STORE) ===");

    return NextResponse.json({
      success: true,
      documents: filteredDocuments,
      count: filteredDocuments.length,
    });

  } catch (error) {
    console.error("=== FETCH DOCUMENTS API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST endpoint to add new documents (for uploads)
export async function POST(req: NextRequest) {
  try {
    console.log("=== ADD DOCUMENT API START (LOCAL STORE) ===");
    
    const body = await req.json();
    const { title, workspaceId, ownerId, status = "ready", acl = "workspace" } = body;

    const newDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workspace_id: workspaceId || "default-workspace",
      owner_id: ownerId || "default-user",
      storage_path: `documents/${title}`,
      acl,
      error: null
    };

    documentsStore.unshift(newDocument); // Add to beginning of array

    console.log("Document added:", newDocument.id);
    console.log("=== ADD DOCUMENT API SUCCESS (LOCAL STORE) ===");

    return NextResponse.json({
      success: true,
      document: newDocument,
    });

  } catch (error) {
    console.error("=== ADD DOCUMENT API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}