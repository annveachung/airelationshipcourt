import "server-only";
import { getUser } from "@/lib/session";
import { postgrest } from "./postgrest";

// Runs as the signed-in user, so Row Level Security applies.
export async function createClient() {
  const user = await getUser();
  return user ? postgrest("authenticated", user.id) : postgrest("anon");
}
