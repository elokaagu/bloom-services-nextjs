import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    console.log("=== TESTING SUPABASE CONNECTION ===");

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    console.log("Environment check:");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.log("- SUPABASE_ANON_KEY:", supabaseKey ? "✅ Set" : "❌ Missing");

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Supabase environment variables",
          details: {
            url: !!supabaseUrl,
            key: !!supabaseKey,
          },
        },
        { status: 400 }
      );
    }

    console.log("Testing basic fetch to Supabase...");

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("✅ Supabase connection successful!");
        return NextResponse.json({
          success: true,
          message: "Supabase connection successful",
          url: supabaseUrl,
          status: response.status,
        });
      } else {
        console.log(
          "❌ Supabase connection failed:",
          response.status,
          response.statusText
        );
        return NextResponse.json(
          {
            success: false,
            error: "Supabase connection failed",
            status: response.status,
            statusText: response.statusText,
          },
          { status: response.status }
        );
      }
    } catch (fetchError) {
      console.log("❌ Fetch error:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Network error connecting to Supabase",
          details:
            fetchError instanceof Error ? fetchError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("=== CONNECTION TEST ERROR ===", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
