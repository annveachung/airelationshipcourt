# Phase 2 — Auth & Couple

## 1. Goal

A person can sign in with Google, create a couple, send their partner an invite link, and the partner can join. Two real accounts end up paired as Partner A and Partner B, and the app knows who is who on every request. This phase also installs the security foundation (two Supabase clients, Row Level Security) that Phase 3 onwards relies on.

## 2. Prerequisites

- Phase 1 complete.
- **Accounts and setup you do by hand** (Claude can't do these for you):
  1. Create a free project at supabase.com. Note the **Project URL**, the **anon key** and the **service-role key** (Project Settings → API).
  2. In Google Cloud Console create an OAuth client (type *Web application*). Add the redirect URI shown in Supabase under Authentication → Providers → Google.
  3. Paste the Google client ID and secret into that Supabase provider screen and enable it.
  4. In Supabase → Authentication → URL Configuration set the site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to redirect URLs.
  5. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep the service-role key out of the browser — it's added in Phase 3 when first needed.
- Read `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `01-app/03-api-reference/03-file-conventions/proxy.md`.

## 3. What gets built

**Database** — `supabase/migrations/0001_auth_and_couples.sql`, run in the Supabase SQL editor
- `profiles` — one row per user, mirrors the Supabase auth user (name, avatar, email). Filled automatically by a database trigger on sign-up.
- `couples` — `created_by`, `status` (`pending` → `active`).
- `couple_members` — `couple_id`, `user_id`, `role` (`partner_a` / `partner_b`). Two unique constraints do the heavy lifting: **`UNIQUE (couple_id, role)`** caps a couple at two people, **`UNIQUE (user_id)`** allows one couple per user.
- `couple_invites` — unguessable single-use `code`, `expires_at` (7 days), `accepted_by`.
- Helper function `is_couple_member(couple_id)` and the `accept_invite(code)` function (see below).
- Row Level Security switched on for every table, with policies for the above.

**Supabase clients** (`lib/supabase/`)
- `browser.ts` — for client components.
- `server.ts` — for server components, actions and route handlers; reads the session cookie. Uses anon key, so **Row Level Security applies**.
- (The service-role client arrives in Phase 3.)

**Routes**
- `proxy.ts` (repo root) — refreshes the session cookie on each request and redirects signed-out visitors to `/login`. Also blocks `/design` when `NODE_ENV === "production"`.
- `app/login/page.tsx` — "Sign in with Google" screen in the court style.
- `app/auth/callback/route.ts` — exchanges the OAuth code for a session, then redirects.
- `app/couple/new` — create a couple, then show the invite link with a copy button.
- `app/join/[code]/page.tsx` — the page a partner lands on from the link; signs them in first if needed, then joins.
- `app/page.tsx` — becomes the **Docket**: shows "create a couple", "waiting for your partner", or the paired couple's names, depending on state.
- `components/auth/*` — sign-out button, avatar, invite-link card.

**Dev affordance**
- A development-only switcher (`NODE_ENV === "development"`) so you can test two-sided flows without two Google accounts. See implementation notes.

## 4. Key decisions

- **Invite = a copy-and-paste link**, not an email. No email service to set up. The user sends it through their own messaging app.
- **Roles are fixed at join time:** whoever creates the couple is `partner_a`, whoever joins is `partner_b`, forever. Every later table (percentages, feedback, charges) is keyed to those two labels, which removes a whole class of "whose 60% is this?" bugs.
- **One couple per user.** It makes every later query simple. It is the first constraint you'd relax if you ever support new partners.
- **Two layers of security, kept simple.** Row Level Security in the database answers two questions only: *are you in this couple?* and (from Phase 3) *has this row been revealed yet?* Application code answers everything else. Either layer alone is riskier than both together.
- **Joining goes through one database function**, `accept_invite(code)`, marked `SECURITY DEFINER`. It has to read an invite row the caller isn't allowed to see, so it does the checks itself, in one transaction: code exists, not used, not expired, caller isn't the creator, a seat is free.
- **Nobody can list invites.** `couple_invites` has RLS on and *zero* policies, so a logged-in user can't enumerate codes. Codes are 128 bits of randomness — guessing is not a realistic attack.

## 5. Implementation notes

**Next.js 16:**
- `cookies()` is async: `const cookieStore = await cookies()` inside `lib/supabase/server.ts`. Every server client factory is therefore `async`.
- Route handler and page `params` are Promises: `const { code } = await params`.
- The file is `proxy.ts` and exports `proxy` (not `middleware`). Give it a `config.matcher` that skips `_next/static`, `_next/image`, favicon and image files — otherwise it runs on every asset.
- Use the `@supabase/ssr` package (`createServerClient`, `createBrowserClient`). Install `@supabase/supabase-js` and `@supabase/ssr`. In server code prefer `supabase.auth.getUser()` over `getSession()` — `getUser()` verifies with the server, `getSession()` only reads the cookie.
- Preserve the invite code through login: when `proxy` redirects a signed-out visitor from `/join/abc`, pass `?next=/join/abc` so they land back there after the Google round-trip.

**Supabase / SQL:**
- The `profiles` trigger is `AFTER INSERT ON auth.users`, copying `raw_user_meta_data->>'full_name'` and `avatar_url`.
- `is_couple_member` must be `SECURITY DEFINER` and `STABLE`, otherwise the policy on `couple_members` recurses into itself.
- `accept_invite` order of operations: lock invite row `FOR UPDATE` → validate → insert into `couple_members` as `partner_b` → set `accepted_at` / `accepted_by` → set `couples.status = 'active'`. Uniqueness on `(couple_id, role)` makes a race for the second seat fail cleanly.
- Generate invite codes in server code from 16 random bytes, base64url-encoded.
- Migrations are numbered files kept in the repo and pasted into the Supabase SQL editor. No CLI required for now.

**Dev-only partner switcher:** simplest reliable approach is two normal Google sign-ins in two browser profiles (or one normal + one private window). A convenience toggle that fakes identity is *not* worth the risk of leaking into production; if you want one, gate it strictly on `NODE_ENV` and never on a request parameter.

**Security reminders:** never import a service-role client into a page or component; validate the invite code format before querying; log user ids, never invite codes or testimony.

## 6. Done when

- [ ] Visiting `/` while signed out redirects to `/login`.
- [ ] "Sign in with Google" completes and returns you to the Docket, showing your name and avatar.
- [ ] Signing out returns you to `/login`; refreshing the page while signed in keeps you signed in.
- [ ] Creating a couple shows an invite link; the Docket now says you're waiting for your partner.
- [ ] Opening that link in a second browser profile, signing in with a second Google account, and joining pairs you: both Docket views show both names, with roles A and B.
- [ ] Reusing the same link a second time fails with a friendly message.
- [ ] A third account opening the (now used) link cannot join.
- [ ] In the Supabase table editor, `couple_invites` cannot be read by a normal signed-in query (returns nothing / denied).
- [ ] `npm run lint` and `npm run build` pass.

## 7. Deliberately not in this phase

- Cases, testimony, the state machine → Phase 3
- The service-role Supabase client → Phase 3
- Any AI → Phase 4
- Notifications ("your partner joined") → Phase 7
- Invite by email, multiple couples per user, leaving/deleting a couple → not planned
