-- Phase 4: cloud sync + live spectator view.
-- Mirrors the local IndexedDB schema (src/types/index.ts). Local ids are
-- crypto.randomUUID(), so uuid primary keys upsert cleanly by id.
--
-- Access model:
--   * Owners (auth.uid() = teams.owner_id) can read/write their teams and
--     everything under them.
--   * Anyone (including anonymous) can READ data for public teams — that is
--     what powers the /watch/:gameId spectator page and shared stats.
--     Set teams.is_public = false to opt a team out.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.teams (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  short_name  text not null default '',
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.players (
  id          uuid primary key,
  team_id     uuid not null references public.teams (id) on delete cascade,
  name        text not null,
  number      text not null default '',
  gender      text not null default 'X',
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table public.games (
  id             uuid primary key,
  team_id        uuid not null references public.teams (id) on delete cascade,
  opponent       text not null,
  date           timestamptz not null,
  location       text,
  wind_direction text,
  target_score   int,
  starting_line  text,
  is_complete    boolean not null default false,
  our_score      int not null default 0,
  their_score    int not null default 0,
  updated_at     timestamptz not null default now()
);

create table public.points (
  id           uuid primary key,
  game_id      uuid not null references public.games (id) on delete cascade,
  point_number int not null,
  line         text not null,
  started_at   timestamptz not null,
  ended_at     timestamptz,
  player_ids   jsonb not null default '[]',
  scored_by    text,
  updated_at   timestamptz not null default now()
);

create table public.events (
  id          uuid primary key,
  point_id    uuid not null references public.points (id) on delete cascade,
  game_id     uuid not null references public.games (id) on delete cascade,
  type        text not null,
  thrower_id  uuid,
  receiver_id uuid,
  "timestamp" timestamptz not null,
  seq         int,
  undone      boolean not null default false,
  updated_at  timestamptz not null default now()
);

create index players_team_id_idx on public.players (team_id);
create index games_team_id_idx   on public.games (team_id);
create index points_game_id_idx  on public.points (game_id);
create index events_game_id_idx  on public.events (game_id);
create index events_point_id_idx on public.events (point_id);
create index teams_owner_id_idx  on public.teams (owner_id);

-- ── updated_at maintenance ──────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger teams_updated_at   before update on public.teams   for each row execute function public.set_updated_at();
create trigger players_updated_at before update on public.players for each row execute function public.set_updated_at();
create trigger games_updated_at   before update on public.games   for each row execute function public.set_updated_at();
create trigger points_updated_at  before update on public.points  for each row execute function public.set_updated_at();
create trigger events_updated_at  before update on public.events  for each row execute function public.set_updated_at();

-- ── Row-level security ──────────────────────────────────────────────────────

alter table public.teams   enable row level security;
alter table public.players enable row level security;
alter table public.games   enable row level security;
alter table public.points  enable row level security;
alter table public.events  enable row level security;

-- helper predicates (inlined per-table below; Postgres RLS can't share them
-- without security-definer functions, which we avoid for auditability)

-- teams
create policy teams_select on public.teams for select
  to anon, authenticated
  using (is_public or owner_id = auth.uid());
create policy teams_insert on public.teams for insert
  to authenticated
  with check (owner_id = auth.uid());
create policy teams_update on public.teams for update
  to authenticated
  using (owner_id = auth.uid());
create policy teams_delete on public.teams for delete
  to authenticated
  using (owner_id = auth.uid());

-- players
create policy players_select on public.players for select
  to anon, authenticated
  using (exists (select 1 from public.teams t
                 where t.id = team_id and (t.is_public or t.owner_id = auth.uid())));
create policy players_write on public.players for all
  to authenticated
  using (exists (select 1 from public.teams t
                 where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.teams t
                      where t.id = team_id and t.owner_id = auth.uid()));

-- games
create policy games_select on public.games for select
  to anon, authenticated
  using (exists (select 1 from public.teams t
                 where t.id = team_id and (t.is_public or t.owner_id = auth.uid())));
create policy games_write on public.games for all
  to authenticated
  using (exists (select 1 from public.teams t
                 where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.teams t
                      where t.id = team_id and t.owner_id = auth.uid()));

-- points
create policy points_select on public.points for select
  to anon, authenticated
  using (exists (select 1 from public.games g join public.teams t on t.id = g.team_id
                 where g.id = game_id and (t.is_public or t.owner_id = auth.uid())));
create policy points_write on public.points for all
  to authenticated
  using (exists (select 1 from public.games g join public.teams t on t.id = g.team_id
                 where g.id = game_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.games g join public.teams t on t.id = g.team_id
                      where g.id = game_id and t.owner_id = auth.uid()));

-- events
create policy events_select on public.events for select
  to anon, authenticated
  using (exists (select 1 from public.games g join public.teams t on t.id = g.team_id
                 where g.id = game_id and (t.is_public or t.owner_id = auth.uid())));
create policy events_write on public.events for all
  to authenticated
  using (exists (select 1 from public.games g join public.teams t on t.id = g.team_id
                 where g.id = game_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.games g join public.teams t on t.id = g.team_id
                      where g.id = game_id and t.owner_id = auth.uid()));

-- ── Realtime ────────────────────────────────────────────────────────────────
-- The spectator page subscribes to postgres_changes on these tables.
-- (Realtime respects RLS, so anonymous subscribers only see public teams.)

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.points;
alter publication supabase_realtime add table public.events;
