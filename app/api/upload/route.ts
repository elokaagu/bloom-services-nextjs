import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== UPLOAD API START (LOCAL STORE) ===");

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId =
      (formData.get("workspaceId") as string) ||
      "550e8400-e29b-41d4-a716-446655440001";
    const ownerId =
      (formData.get("ownerId") as string) ||
      "550e8400-e29b-41d4-a716-446655440002";
    const title = (formData.get("title") as string) || file?.name;

    console.log("Form data parsed:", {
      fileName: file?.name,
      fileSize: file?.size,
      workspaceId,
      ownerId,
    });

    if (!file) {
      console.error("No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create document and add to local storage via documents API
    const documentData = {
      title: title,
      workspaceId: "550e8400-e29b-41d4-a716-446655440001", // Policy Research workspace UUID
      ownerId: "550e8400-e29b-41d4-a716-446655440002", // John Doe user UUID
      status: "ready",
      acl: "workspace",
    };

    // Add to Supabase database
    const addResponse = await fetch(
      `${req.nextUrl.origin}/api/documents-supabase`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentData),
      }
    );

    if (!addResponse.ok) {
      throw new Error("Failed to add document to store");
    }

    const { document } = await addResponse.json();

    console.log("Document uploaded and stored:", document.id);
    console.log("=== UPLOAD API SUCCESS (LOCAL STORE) ===");

    return NextResponse.json({
      success: true,
      document: document,
    });
  } catch (error) {
    console.error("=== UPLOAD API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
