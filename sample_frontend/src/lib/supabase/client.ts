import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";
const supabaseStorageKey = "writerz-auth";

const authLock = async <T,>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>,
): Promise<T> => await fn();

console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY:", supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase ENV not loaded correctly");
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: supabaseStorageKey,
        lock: authLock,
      },
    })
  : null;

console.log("SUPABASE CLIENT:", supabase);

export const getSupabaseClient = (): SupabaseClient | null => {
  return supabase;
};

export const getSupabaseSession = async (
  client: SupabaseClient,
): Promise<Session | null> => {
  const result = await client.auth.getSession();
  console.log("SESSION:", result);

  if (result.error) {
    throw result.error;
  }

  return result.data.session ?? null;
};

export const requireSupabaseSession = async (
  client: SupabaseClient,
): Promise<Session> => {
  const session = await getSupabaseSession(client);

  if (!session?.access_token) {
    throw new Error("Auth session missing");
  }

  return session;
};
