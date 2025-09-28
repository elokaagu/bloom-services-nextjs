import { createClient } from "@supabase/supabase-js";

// Lazy client creation to avoid build-time errors
let _supabase: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (_supabase) return _supabase;
  
  // Environment variables
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  // Only validate and create client when actually needed
  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL"
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing Supabase anon key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY"
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
})();

// Lazy admin client creation
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const supabaseAdmin = (() => {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    
  if (!supabaseServiceKey || !supabaseUrl) {
    return null;
  }
  
  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _supabaseAdmin;
})();

// Test connection function
export async function testSupabaseConnection() {
  try {
    console.log("Testing Supabase connection...");
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("URL:", supabaseUrl);
    console.log("Anon Key:", supabaseAnonKey ? "Set" : "Missing");
    console.log("Service Key:", supabaseServiceKey ? "Set" : "Missing");

    const { data, error } = await supabase
      .from("documents")
      .select("count")
      .limit(1);

    if (error) {
      console.error("Supabase connection test failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Supabase connection successful!");
    return { success: true, data };
  } catch (err) {
    console.error("Supabase connection test error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
