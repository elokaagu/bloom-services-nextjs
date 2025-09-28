import { createClient } from "@supabase/supabase-js";

// Lazy client creation to avoid build-time errors
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Return a mock client during SSR/build
    return {} as any;
  }
  
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
}

// Export as a getter to ensure lazy evaluation
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseClient();
    return client[prop as keyof typeof client];
  }
});

// Lazy admin client creation
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdminClient() {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Return a mock client during SSR/build
    return {} as any;
  }
  
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
}

// Export as a getter to ensure lazy evaluation
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseAdminClient();
    if (!client) return undefined;
    return client[prop as keyof typeof client];
  }
});

// Test connection function
export async function testSupabaseConnection() {
  try {
    console.log("Testing Supabase connection...");

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("URL:", supabaseUrl);
    console.log("Anon Key:", supabaseAnonKey ? "Set" : "Missing");
    console.log("Service Key:", supabaseServiceKey ? "Set" : "Missing");

    const client = getSupabaseClient();
    const { data, error } = await client
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
