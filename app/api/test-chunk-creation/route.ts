import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== TEST CHUNK CREATION ===");
    
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }
    
    console.log("Testing chunk creation for document:", documentId);
    
    // Call the create-chunks API
    const chunkResponse = await fetch(`${req.nextUrl.origin}/api/create-chunks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    
    console.log("Chunk response status:", chunkResponse.status);
    
    if (chunkResponse.ok) {
      const result = await chunkResponse.json();
      console.log("Chunk creation result:", result);
      return NextResponse.json({
        success: true,
        result,
        status: chunkResponse.status
      });
    } else {
      const errorText = await chunkResponse.text();
      console.error("Chunk creation failed:", errorText);
      return NextResponse.json({
        success: false,
        error: errorText,
        status: chunkResponse.status
      });
    }
    
  } catch (error) {
    console.error("Test chunk creation error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
