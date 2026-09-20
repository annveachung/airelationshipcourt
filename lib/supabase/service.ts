// SERVER ONLY. Uses the secret key, which BYPASSES Row Level Security.
// Never import this from a page or component. Today it's used by
// lib/cases/state-machine.ts only; keep it that way unless there's a strong reason.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. Add it to .env.local (Supabase -> API Keys -> secret key), then restart `npm run dev`.",
    );
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
