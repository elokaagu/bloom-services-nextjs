import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== MOCK UPLOAD API START ===");
    
    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId = formData.get("workspaceId") as string || "default-workspace";
    const ownerId = formData.get("ownerId") as string || "default-user";
    const title = formData.get("title") as string || file?.name;

    console.log("Form data parsed:", { 
      fileName: file?.name, 
      fileSize: file?.size, 
      workspaceId, 
      ownerId 
    });

    if (!file) {
      console.error("No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock document data
    const mockDocument = {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workspace_id: workspaceId,
      owner_id: ownerId,
      title: title,
      storage_path: `mock-storage/${file.name}`,
      status: "ready",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("Mock document created:", mockDocument.id);
    console.log("=== MOCK UPLOAD API SUCCESS ===");

    return NextResponse.json({ 
      success: true, 
      document: mockDocument 
    });

  } catch (error) {
    console.error("=== MOCK UPLOAD API ERROR ===", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}