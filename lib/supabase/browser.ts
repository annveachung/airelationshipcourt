import { createBrowserClient } from "@supabase/ssr";

// NEXT_PUBLIC_ vars must be read as literal property accesses so Next inlines them.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
