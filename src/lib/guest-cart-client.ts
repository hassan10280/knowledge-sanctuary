import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Creates a Supabase client that includes x-session-id in request headers.
 * This is needed for guest (unauthenticated) abandoned cart updates,
 * since the RLS policy checks this header to authorize session-based access.
 */
export function createGuestCartClient(sessionId: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { "x-session-id": sessionId },
    },
  });
}
