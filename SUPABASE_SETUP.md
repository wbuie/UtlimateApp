# Supabase setup (Phase 4 cloud sync)

One-time provisioning. Takes about five minutes; everything in the app is
already wired and simply lights up once the two env vars exist.

## 1. Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick any name (e.g. `ultianalytics`), a strong database password (you won't
   need it day-to-day), and a region near your users.

## 2. Run the schema migration

1. In the dashboard open **SQL Editor → New query**.
2. Paste the entire contents of
   [`supabase/migrations/20260714000000_phase4_init.sql`](supabase/migrations/20260714000000_phase4_init.sql)
   and hit **Run**. It creates the five tables, row-level-security policies,
   and Realtime publication.

(Alternative: `supabase link && supabase db push` with the [Supabase CLI](https://supabase.com/docs/guides/cli).)

## 3. Configure auth (magic links)

1. **Authentication → Sign In / Up**: make sure the **Email** provider is
   enabled (it is by default) — magic links / OTP is the flow the app uses.
   No password setup needed.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://utlimate-app.vercel.app`
   - **Redirect URLs**: add `http://localhost:5173` (dev) and any preview URLs.

## 4. Wire the env vars

From **Settings → API** copy the **Project URL** and the **anon public** key.

- **Vercel**: Project → Settings → Environment Variables →
  - `VITE_SUPABASE_URL` = the project URL
  - `VITE_SUPABASE_ANON_KEY` = the anon key
  - Redeploy (env vars are baked in at build time).
- **Local dev**: copy `.env.example` to `.env.local` and fill in the values.

The anon key is safe to expose in the client — row-level security is what
gates access (owners write; the public can only read teams marked public).

## 5. Use it

1. Open the app → the **☁ Cloud Sync** card appears on the home screen.
2. Sign in with your email (magic link).
3. Open a team → **☁ Push** uploads the full team (roster, games, points, events).
4. From then on, tracking writes stream to the cloud automatically while
   you're signed in ("live sync"). The **📡 Share** button in the tracker
   copies the public `/watch/<gameId>` spectator link.
5. On another device: sign in with the same email → Cloud Sync card →
   **Pull team from cloud**.

## Privacy notes

- Teams sync as **public-readable** by default (that's what makes spectator
  links shareable with anyone, like ultianalytics.com team pages). To make a
  team private, set `is_public = false` on its row (Table Editor → teams);
  spectator links then require the owner to be signed in.
- Deleting a team/game in the app deletes it in the cloud too (cascades).
