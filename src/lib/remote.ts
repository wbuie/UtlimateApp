// Phase 4: mapping + transport between the local IndexedDB shapes (camelCase,
// Date objects) and the Supabase tables (snake_case, ISO strings), plus a
// small write-through queue so live tracking streams to the cloud without
// ever blocking or breaking the offline flow.
import type { Team, Player, Game, Point, GameEvent } from '../types'
import { supabase } from './supabase'

export type RemoteTable = 'teams' | 'players' | 'games' | 'points' | 'events'

// ── Row mappers (local ⇄ remote) ────────────────────────────────────────────

const iso = (d: Date | string) => new Date(d).toISOString()

export function teamToRow(t: Team) {
  return {
    id: t.id,
    name: t.name,
    short_name: t.shortName,
    created_at: iso(t.createdAt),
    // owner_id defaults to auth.uid() server-side
  }
}

export function playerToRow(p: Player) {
  return {
    id: p.id, team_id: p.teamId, name: p.name,
    number: p.number, gender: p.gender, active: p.active,
  }
}

export function gameToRow(g: Game) {
  return {
    id: g.id, team_id: g.teamId, opponent: g.opponent, date: iso(g.date),
    location: g.location ?? null, wind_direction: g.windDirection ?? null,
    target_score: g.targetScore ?? null, starting_line: g.startingLine ?? null,
    is_complete: g.isComplete, our_score: g.ourScore, their_score: g.theirScore,
  }
}

export function pointToRow(p: Point) {
  return {
    id: p.id, game_id: p.gameId, point_number: p.pointNumber, line: p.line,
    started_at: iso(p.startedAt), ended_at: p.endedAt ? iso(p.endedAt) : null,
    player_ids: p.playerIds, scored_by: p.scoredBy ?? null,
  }
}

export function eventToRow(e: GameEvent) {
  return {
    id: e.id, point_id: e.pointId, game_id: e.gameId, type: e.type,
    thrower_id: e.throwerId ?? null, receiver_id: e.receiverId ?? null,
    timestamp: iso(e.timestamp), seq: e.seq ?? null, undone: e.undone,
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToTeam(r: any): Team {
  return { id: r.id, name: r.name, shortName: r.short_name, createdAt: new Date(r.created_at), ownerId: r.owner_id }
}

export function rowToPlayer(r: any): Player {
  return { id: r.id, teamId: r.team_id, name: r.name, number: r.number, gender: r.gender, active: r.active }
}

export function rowToGame(r: any): Game {
  return {
    id: r.id, teamId: r.team_id, opponent: r.opponent, date: new Date(r.date),
    location: r.location ?? undefined, windDirection: r.wind_direction ?? null,
    targetScore: r.target_score ?? undefined, startingLine: r.starting_line ?? undefined,
    isComplete: r.is_complete, ourScore: r.our_score, theirScore: r.their_score,
  }
}

export function rowToPoint(r: any): Point {
  return {
    id: r.id, gameId: r.game_id, pointNumber: r.point_number, line: r.line,
    startedAt: new Date(r.started_at), endedAt: r.ended_at ? new Date(r.ended_at) : undefined,
    playerIds: r.player_ids ?? [], scoredBy: r.scored_by ?? null,
  }
}

export function rowToEvent(r: any): GameEvent {
  return {
    id: r.id, pointId: r.point_id, gameId: r.game_id, type: r.type,
    throwerId: r.thrower_id ?? undefined, receiverId: r.receiver_id ?? undefined,
    timestamp: new Date(r.timestamp), seq: r.seq ?? undefined, undone: r.undone,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function toRow(table: RemoteTable, record: unknown): Record<string, unknown> {
  switch (table) {
    case 'teams':   return teamToRow(record as Team)
    case 'players': return playerToRow(record as Player)
    case 'games':   return gameToRow(record as Game)
    case 'points':  return pointToRow(record as Point)
    case 'events':  return eventToRow(record as GameEvent)
  }
}

// ── Write-through queue ─────────────────────────────────────────────────────
// db.ts calls queueChange() after every local write/delete. The queue is
// in-memory only: it exists to stream live-game updates to spectators, not to
// be the source of truth (that's IndexedDB — a full "Push to cloud" replays
// everything). Flushes are debounced, batched per table, retried on failure,
// and silently dropped when the cloud isn't configured or nobody is signed in.

interface QueuedChange {
  table: RemoteTable
  op: 'upsert' | 'delete'
  row: Record<string, unknown> | { id: string }
}

// parent tables must flush before children (FK order); deletes reversed
const TABLE_ORDER: RemoteTable[] = ['teams', 'players', 'games', 'points', 'events']

let queue: QueuedChange[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let enabled = false
let onQueueStateChange: ((pending: number, error: string | null) => void) | null = null

export function setLiveSyncEnabled(on: boolean) {
  enabled = on
  if (!on) queue = []
  else scheduleFlush()
}

export function onSyncQueueChange(cb: typeof onQueueStateChange) {
  onQueueStateChange = cb
}

export function queueChange(table: RemoteTable, op: 'upsert' | 'delete', record: unknown) {
  if (!supabase || !enabled) return
  queue.push({ table, op, row: op === 'upsert' ? toRow(table, record) : { id: (record as { id: string }).id } })
  onQueueStateChange?.(queue.length, null)
  scheduleFlush()
}

function scheduleFlush() {
  if (flushTimer || !queue.length) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, 800)
}

async function flushQueue(): Promise<void> {
  if (!supabase || !enabled || !queue.length) return
  const batch = queue
  queue = []

  try {
    // upserts in FK order, then deletes in reverse order
    for (const table of TABLE_ORDER) {
      const rows = batch.filter(c => c.table === table && c.op === 'upsert').map(c => c.row)
      if (!rows.length) continue
      const { error } = await supabase.from(table).upsert(dedupeById(rows), { onConflict: 'id' })
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    for (const table of [...TABLE_ORDER].reverse()) {
      const ids = batch.filter(c => c.table === table && c.op === 'delete').map(c => (c.row as { id: string }).id)
      if (!ids.length) continue
      const { error } = await supabase.from(table).delete().in('id', ids)
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    onQueueStateChange?.(queue.length, null)
    if (queue.length) scheduleFlush()
  } catch (err) {
    // put the batch back at the front and retry later (offline, RLS, etc.)
    queue = [...batch, ...queue]
    onQueueStateChange?.(queue.length, err instanceof Error ? err.message : 'sync failed')
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(() => { flushTimer = null; void flushQueue() }, 10_000)
  }
}

function dedupeById(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  // keep the LAST write for each id in the batch
  const map = new Map<unknown, Record<string, unknown>>()
  for (const r of rows) map.set(r.id, r)
  return [...map.values()]
}

// ── Full push / pull ────────────────────────────────────────────────────────

const CHUNK = 400

async function upsertChunked(table: RemoteTable, rows: Record<string, unknown>[]) {
  if (!supabase) throw new Error('cloud not configured')
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict: 'id' })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

export interface TeamData {
  team: Team
  players: Player[]
  games: Game[]
  points: Point[]
  events: GameEvent[]
}

// Replays an entire team into the cloud. Idempotent (upserts by id), so it's
// safe to run any time — used for the initial upload and as a repair tool.
export async function pushTeam(data: TeamData): Promise<void> {
  await upsertChunked('teams', [teamToRow(data.team)])
  await upsertChunked('players', data.players.map(playerToRow))
  await upsertChunked('games', data.games.map(gameToRow))
  await upsertChunked('points', data.points.map(pointToRow))
  await upsertChunked('events', data.events.map(eventToRow))
}

export async function listRemoteTeams(): Promise<Team[]> {
  if (!supabase) return []
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []
  const { data, error } = await supabase
    .from('teams').select('*').eq('owner_id', auth.user.id).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToTeam)
}

export async function pullTeam(teamId: string): Promise<TeamData> {
  if (!supabase) throw new Error('cloud not configured')
  const [teamRes, playersRes, gamesRes] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).single(),
    supabase.from('players').select('*').eq('team_id', teamId),
    supabase.from('games').select('*').eq('team_id', teamId),
  ])
  if (teamRes.error) throw new Error(teamRes.error.message)
  if (playersRes.error) throw new Error(playersRes.error.message)
  if (gamesRes.error) throw new Error(gamesRes.error.message)

  const gameIds = (gamesRes.data ?? []).map(g => g.id)
  const [pointsRes, eventsRes] = await Promise.all([
    gameIds.length
      ? supabase.from('points').select('*').in('game_id', gameIds)
      : Promise.resolve({ data: [], error: null }),
    gameIds.length
      ? supabase.from('events').select('*').in('game_id', gameIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (pointsRes.error) throw new Error(pointsRes.error.message)
  if (eventsRes.error) throw new Error(eventsRes.error.message)

  return {
    team: rowToTeam(teamRes.data),
    players: (playersRes.data ?? []).map(rowToPlayer),
    games: (gamesRes.data ?? []).map(rowToGame),
    points: (pointsRes.data ?? []).map(rowToPoint),
    events: (eventsRes.data ?? []).map(rowToEvent),
  }
}

// ── Spectator reads (anonymous, RLS-gated to public teams) ─────────────────

export interface SpectatorSnapshot {
  game: Game
  teamName: string
  players: Player[]
  points: Point[]
  events: GameEvent[]
}

export async function fetchSpectatorSnapshot(gameId: string): Promise<SpectatorSnapshot | null> {
  if (!supabase) return null
  const gameRes = await supabase.from('games').select('*').eq('id', gameId).maybeSingle()
  if (gameRes.error) throw new Error(gameRes.error.message)
  if (!gameRes.data) return null
  const game = rowToGame(gameRes.data)

  const [teamRes, playersRes, pointsRes, eventsRes] = await Promise.all([
    supabase.from('teams').select('name').eq('id', game.teamId).maybeSingle(),
    supabase.from('players').select('*').eq('team_id', game.teamId),
    supabase.from('points').select('*').eq('game_id', gameId),
    supabase.from('events').select('*').eq('game_id', gameId).order('timestamp').order('seq'),
  ])
  return {
    game,
    teamName: teamRes.data?.name ?? 'Home',
    players: (playersRes.data ?? []).map(rowToPlayer),
    points: (pointsRes.data ?? []).map(rowToPoint),
    events: (eventsRes.data ?? []).map(rowToEvent),
  }
}
