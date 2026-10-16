// A PostgREST client for our own Postgres. Every request carries a fresh, short-lived JWT naming
// the database role it runs as, so Row Level Security works exactly as it did on Supabase:
//   anon / authenticated -> policies apply (auth.uid() is the JWT's `sub`)
//   service_role         -> BYPASSES Row Level Security (server-only code paths)
// Minting per request (not per client) keeps long-lived clients working across slow AI calls.
//
// No "server-only" import here so standalone scripts (scripts/*.ts) can use it too.
import { PostgrestClient } from "@supabase/postgrest-js";
import { SignJWT } from "jose";

export type DbRole = "anon" | "authenticated" | "service_role";

function postgrestEnv() {
  const url = process.env.POSTGREST_URL;
  const secret = process.env.POSTGREST_JWT_SECRET;
  if (!url || !secret) {
    throw new Error(
      "Missing database settings. Add POSTGREST_URL and POSTGREST_JWT_SECRET to .env.local " +
        "(see .env.example), then restart `npm run dev`.",
    );
  }
  return { url, key: new TextEncoder().encode(secret) };
}

export function postgrest(role: DbRole, userId?: string) {
  const { url, key } = postgrestEnv();

  return new PostgrestClient(url, {
    fetch: async (input, init) => {
      const token = await new SignJWT({ role, ...(userId ? { sub: userId } : {}) })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1m")
        .sign(key);
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers, cache: "no-store" });
    },
  });
}
