import { createClient } from "@supabase/supabase-js";

let supabaseAnonInstance: ReturnType<typeof createClient> | null = null;
let supabaseServiceInstance: ReturnType<typeof createClient> | null = null;

export const supabaseAnon = () => {
  if (!supabaseAnonInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY"
      );
    }

    supabaseAnonInstance = createClient(url, key);
  }
  return supabaseAnonInstance;
};

export const supabaseService = () => {
  if (!supabaseServiceInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    supabaseServiceInstance = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return supabaseServiceInstance;
};
