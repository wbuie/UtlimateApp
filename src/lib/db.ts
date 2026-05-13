import Dexie, { type Table } from 'dexie'
import type { Team, Player, Game, Point, GameEvent } from '../types'

export class UltiDB extends Dexie {
  teams!: Table<Team>
  players!: Table<Player>
  games!: Table<Game>
  points!: Table<Point>
  events!: Table<GameEvent>

  constructor() {
    super('UltiAnalytics')
    this.version(1).stores({
      teams:   '&id, ownerId, createdAt',
      players: '&id, teamId, active',
      games:   '&id, teamId, date, isComplete',
      points:  '&id, gameId, pointNumber',
      events:  '&id, pointId, gameId, type, timestamp, undone',
    })
  }
}

export const db = new UltiDB()

// ── Teams ──────────────────────────────────────────────
export async function getTeams(): Promise<Team[]> {
  return db.teams.orderBy('createdAt').reverse().toArray()
}

export async function upsertTeam(team: Team): Promise<void> {
  await db.teams.put(team)
}

export async function deleteTeam(id: string): Promise<void> {
  await db.transaction('rw', [db.teams, db.players, db.games, db.points, db.events], async () => {
    const gameIds = await db.games.where('teamId').equals(id).primaryKeys()
    const pointIds = (
      await Promise.all(gameIds.map(gid => db.points.where('gameId').equals(gid as string).primaryKeys()))
    ).flat()
    await db.events.where('pointId').anyOf(pointIds as string[]).delete()
    await db.points.where('gameId').anyOf(gameIds as string[]).delete()
    await db.games.where('teamId').equals(id).delete()
    await db.players.where('teamId').equals(id).delete()
    await db.teams.delete(id)
  })
}

// ── Players ────────────────────────────────────────────
export async function getPlayers(teamId: string): Promise<Player[]> {
  return db.players.where('teamId').equals(teamId).sortBy('number')
}

export async function upsertPlayer(player: Player): Promise<void> {
  await db.players.put(player)
}

export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id)
}

// ── Games ──────────────────────────────────────────────
export async function getGames(teamId: string): Promise<Game[]> {
  return db.games.where('teamId').equals(teamId).reverse().sortBy('date')
}

export async function getGame(id: string): Promise<Game | undefined> {
  return db.games.get(id)
}

export async function upsertGame(game: Game): Promise<void> {
  await db.games.put(game)
}

export async function deleteGame(id: string): Promise<void> {
  await db.transaction('rw', [db.games, db.points, db.events], async () => {
    const pointIds = await db.points.where('gameId').equals(id).primaryKeys()
    await db.events.where('pointId').anyOf(pointIds as string[]).delete()
    await db.points.where('gameId').equals(id).delete()
    await db.games.delete(id)
  })
}

// ── Points ─────────────────────────────────────────────
export async function getPoints(gameId: string): Promise<Point[]> {
  return db.points.where('gameId').equals(gameId).sortBy('pointNumber')
}

export async function upsertPoint(point: Point): Promise<void> {
  await db.points.put(point)
}

// ── Events ─────────────────────────────────────────────
export async function getEvents(gameId: string): Promise<GameEvent[]> {
  return db.events.where('gameId').equals(gameId).sortBy('timestamp')
}

export async function getPointEvents(pointId: string): Promise<GameEvent[]> {
  return db.events.where('pointId').equals(pointId).sortBy('timestamp')
}

export async function upsertEvent(event: GameEvent): Promise<void> {
  await db.events.put(event)
}

export async function markEventUndone(id: string): Promise<void> {
  await db.events.update(id, { undone: true })
}
