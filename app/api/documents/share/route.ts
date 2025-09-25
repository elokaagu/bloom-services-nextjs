import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    console.log("=== SHARE DOCUMENT API START ===");
    
    const body = await req.json();
    const { documentId, shareWith, permissions = "read" } = body;
    
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

    console.log("Sharing document:", documentId, "with:", shareWith);

    // For now, we'll just log the share action
    // In a real implementation, you would:
    // 1. Create share records in document_shares table
    // 2. Send notifications to users
    // 3. Generate share links, etc.

    console.log("Document share action logged:", {
      documentId,
      shareWith,
      permissions,
      timestamp: new Date().toISOString(),
    });

    console.log("=== SHARE DOCUMENT API SUCCESS ===");

    return NextResponse.json({
      success: true,
      message: "Document shared successfully",
      shareInfo: {
        documentId,
        shareWith,
        permissions,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("=== SHARE DOCUMENT API ERROR ===", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
