# AI Relationship Court

Live at **[pairadox.achtlabs.com](https://pairadox.achtlabs.com)**.

Built with Next.js, Auth.js (Google sign-in) and PostgreSQL. The app reads and writes through
[PostgREST](https://postgrest.org), so Row Level Security and the SQL functions in
`db/migrations/` decide what each signed-in person can see and do.

## Development

```bash
npm install
cp .env.example .env.local   # fill in AUTH_*, DASHSCOPE_*
docker compose up -d         # Postgres 16 + PostgREST on 127.0.0.1:54322 / :54321
npm run db:migrate
npm run dev
```

Google sign-in locally needs `http://localhost:3000/api/auth/callback/google` on the OAuth
client's Authorized redirect URIs.

## Deployment

Every push to `main` deploys automatically via GitHub Actions
(`.github/workflows/deploy.yml`): the app is built on the runner, synced to the server
(shared with annvea.com), migrated, and reloaded under pm2 behind nginx.

- One-time server setup (safe to re-run; also fetches the HTTPS certificate):
  `deploy/server-setup.sh` — see the comment at its top for the command.
- Change a server setting: `deploy/set-env.sh KEY`.
- One-time copy of the old Supabase data: `deploy/copy-data.sh`.
