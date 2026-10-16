import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { getUser } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store" };

// The signed-in person's latest notifications (own rows only, via Row Level Security).
export async function GET() {
  const db = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: rows }, { count }, { data: profile }] = await Promise.all([
    db
      .from("notifications")
      .select("id, type, case_id, params, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    db.from("profiles").select("playful_notifications").eq("id", user.id).maybeSingle(),
  ]);

  return NextResponse.json(
    {
      playful: profile?.playful_notifications ?? true,
      unread: count ?? 0,
      items: (rows ?? []).map((n) => ({
        id: n.id,
        type: n.type,
        caseId: n.case_id,
        params: n.params ?? {},
        createdAt: n.created_at,
        read: n.read_at !== null,
      })),
    },
    { headers: NO_STORE },
  );
}

// Marks notifications read: { read: ["id", ...] } or { read: "all" }.
export async function POST(request: Request) {
  const db = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { read?: unknown };
  const ids =
    body.read === "all"
      ? null
      : Array.isArray(body.read)
        ? body.read.filter((id): id is string => typeof id === "string" && UUID.test(id))
        : undefined;
  if (ids === undefined) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { error } = await db.rpc("mark_notifications_read", { ids });
  if (error) console.error("mark_notifications_read failed:", error.message);
  return NextResponse.json({ ok: !error }, { headers: NO_STORE });
}
