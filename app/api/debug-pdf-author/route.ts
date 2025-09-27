import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG API TEST ===");
    
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    
    return NextResponse.json({
      success: true,
      message: "Debug API is working",
      documentId: documentId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== DEBUG API TEST (POST) ===");
    
    const body = await req.json();
    
    return NextResponse.json({
      success: true,
      message: "Debug API POST is working",
      body: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Debug API POST error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}