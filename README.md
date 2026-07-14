# UltiAnalytics

Offline-first ultimate frisbee game tracker and analytics PWA, modeled on
[UltiAnalytics](https://www.ultianalytics.com/). Track every point from the
sideline on a phone, then review per-player and team stats after the game.

## How tracking works

The tracker mirrors the UltiAnalytics flow:

1. **Line gate between points** — before every point you confirm O/D and the
   seven players (last line is preselected; one tap to reuse it). The first
   point asks whether you start on offense (receive) or defense (pull).
2. **Offense** — tap the player who has the disc, then each receiver in turn.
   Goal / Throwaway / Drop / Stall buttons close out the possession.
3. **Defense** — count opponent passes, log D blocks, their drops/stalls,
   Callahans, and their goals.
4. **O/D auto-alternates** after each score, including the **halftime flip**
   (derived from the game's target score, e.g. game to 15 → half at 8).
5. **Substitutions** mid-point credit everyone who took the field; **Undo**
   works across point boundaries (undoing a goal reopens the point).

State is reconstructed from the event log on reload, so a phone lock or
browser restart mid-point resumes exactly where you left off.

## Stats

Per-player: points played, goals, assists, Ds, drops, throwaways, +/-,
throw %, catch %, O/D efficiency, conversion rate. Per-team: O-hold % and
D-break %. Views: ranked player bar charts (per stat), sortable tables,
and a scoring timeline — per game and per season.

## Data, backups & cloud sync

Everything lives in IndexedDB on the device (persistent storage is requested
on startup), so tracking works with zero connectivity.

- **Backup** (team page) exports a full-fidelity JSON of the team — roster,
  games, points, raw events. **Restore team from backup** (home page)
  re-imports it; imports are idempotent upserts by id.
- Game stats export as CSV (aggregates) and raw per-event CSV.
- **Cloud sync (Phase 4, optional)** — when Supabase is configured
  (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md)) a Cloud Sync card appears on
  the home screen. Sign in with a magic link, **☁ Push** a team to the cloud,
  and from then on tracking streams live; **Pull team from cloud** restores it
  on any device. The **📡 Share** button in the tracker copies a public
  `/watch/:gameId` spectator link that updates in real time via Supabase
  Realtime. Without the env vars, none of this UI renders and the app is
  purely offline.

## Development

```sh
npm install
npm run dev        # dev server
npm test           # unit tests (stats + point-state logic)
npm run lint
npm run build      # type-check + production build + PWA assets
npm run preview    # serve the production build
npm run test:e2e   # browser smoke test of the full game flow (needs preview running)
```

## Deployment notes

- SPA routing: `vercel.json` rewrites deep links to `index.html` on Vercel.
  On other static hosts, add the equivalent rule (Netlify `_redirects`, etc.),
  or deep links 404 on refresh.
- The PWA precaches the app shell and self-hosted fonts, so the tracker works
  fully offline after the first load.
- Cloud sync needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build
  time (Vercel project env vars). Schema + policies live in
  `supabase/migrations/`; provisioning steps in
  [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
