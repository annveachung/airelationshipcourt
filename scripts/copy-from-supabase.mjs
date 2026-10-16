// ONE-TIME. Prints SQL that copies every user and row from the old Supabase project into the
// self-hosted database. Reads Supabase through its REST and admin APIs with the secret key, so it
// needs no database password. Run it through deploy/copy-data.sh, which pipes the SQL into psql
// on the server in one transaction (all or nothing).
//
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
// Refuses to run against a target that already has users.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };

// Parents before children (foreign keys), each with its primary key for stable paging.
const TABLES = [
  ["profiles", "id"],
  ["couples", "id"],
  ["couple_members", "couple_id,user_id"],
  ["couple_invites", "id"],
  ["cases", "id"],
  ["testimonies", "id"],
  ["ai_runs", "id"],
  ["case_analyses", "case_id"],
  ["follow_up_questions", "id"],
  ["follow_up_answers", "id"],
  ["follow_up_submissions", "case_id,user_id,round"],
  ["panel_assessments", "id"],
  ["verdicts", "case_id"],
  ["verdict_texts", "case_id,locale"],
  ["report_texts", "case_id,locale"],
  ["treaty_signatures", "case_id,user_id"],
  ["notifications", "id"],
];
const PAGE = 1000;

async function get(path) {
  const res = await fetch(`${url}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function allUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { users: batch } = await get(`/auth/v1/admin/users?page=${page}&per_page=${PAGE}`);
    users.push(...batch);
    if (batch.length < PAGE) return users;
  }
}

async function allRows(table, order) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const batch = await get(`/rest/v1/${table}?select=*&order=${order}&limit=${PAGE}&offset=${offset}`);
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

// Every table Supabase exposes must be one we know how to copy; otherwise data would be left behind.
async function checkNoUnknownTables() {
  const spec = await get("/rest/v1/");
  const exposed = Object.keys(spec.definitions ?? spec.components?.schemas ?? {});
  const known = new Set(TABLES.map(([t]) => t));
  const unknown = exposed.filter((t) => !known.has(t));
  if (unknown.length) throw new Error(`Supabase has tables this script doesn't copy: ${unknown.join(", ")}`);
}

// json_populate_recordset turns JSON rows into the target table's own row type (enums, arrays,
// jsonb, timestamps), so the JSON from the REST API goes in unchanged.
function literal(json) {
  let tag = "json";
  while (json.includes(`$${tag}$`)) tag += "_";
  return `$${tag}$${json}$${tag}$`;
}

function insert(table, rows) {
  if (!rows.length) return `-- ${table}: no rows\n`;
  return (
    `insert into ${table} select * from json_populate_recordset(null::${table}, ${literal(JSON.stringify(rows))});\n` +
    `select '${table}: ' || count(*) from ${table};\n`
  );
}

await checkNoUnknownTables();

const users = (await allUsers()).filter((u) => u.email);
const out = [];
out.push(`\\set ON_ERROR_STOP on`);
out.push(`do $$ begin
  if exists (select 1 from auth.users) then
    raise exception 'The self-hosted database already has users; refusing to copy over them.';
  end if;
end $$;`);

// The profile-creating trigger stays off while users are copied: their profiles come next, as-is.
out.push(`alter table auth.users disable trigger on_auth_user_created;`);
out.push(
  insert(
    "auth.users",
    users.map((u) => ({
      id: u.id,
      email: u.email.toLowerCase(),
      raw_user_meta_data: u.user_metadata ?? {},
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    })),
  ),
);
out.push(`alter table auth.users enable trigger on_auth_user_created;`);

for (const [table, order] of TABLES) {
  const rows = await allRows(table, order);
  console.error(`${table}: ${rows.length} rows`);
  out.push(insert(`public.${table}`, rows));
}
console.error(`auth.users: ${users.length} users`);

process.stdout.write(out.join("\n") + "\n");
