import type { Team, Player, Game, Point, GameEvent } from '../types'
import { db, getPlayers, getGames, getPoints, getEvents } from './db'

// Full-fidelity team backup: everything needed to reconstruct the team on
// another device (or after a cleared browser). Unlike the CSV exports this
// carries raw events, so nothing is lost.
export interface TeamBackup {
  format: 'ultianalytics-backup'
  version: 1
  exportedAt: string
  team: Team
  players: Player[]
  games: Game[]
  points: Point[]
  events: GameEvent[]
}

export async function buildTeamBackup(team: Team): Promise<TeamBackup> {
  const players = await getPlayers(team.id)
  const games = await getGames(team.id)
  const points = (await Promise.all(games.map(g => getPoints(g.id)))).flat()
  const events = (await Promise.all(games.map(g => getEvents(g.id)))).flat()
  return {
    format: 'ultianalytics-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    team, players, games, points, events,
  }
}

export async function exportTeamBackup(team: Team): Promise<void> {
  const backup = await buildTeamBackup(team)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const slug = team.name.replace(/\s+/g, '-').toLowerCase()
  a.download = `ultianalytics-backup-${slug}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Restores a backup. Records are upserted by id, so re-importing the same
// file is safe (idempotent) and merges with newer local data rather than
// duplicating teams.
export async function importTeamBackup(json: string): Promise<Team> {
  let backup: TeamBackup
  try {
    backup = JSON.parse(json)
  } catch {
    throw new Error('Not a valid JSON file')
  }
  if (backup.format !== 'ultianalytics-backup' || !backup.team?.id) {
    throw new Error('Not an UltiAnalytics backup file')
  }

  await db.transaction('rw', [db.teams, db.players, db.games, db.points, db.events], async () => {
    await db.teams.put(reviveDates(backup.team, ['createdAt']))
    await db.players.bulkPut(backup.players ?? [])
    await db.games.bulkPut((backup.games ?? []).map(g => reviveDates(g, ['date'])))
    await db.points.bulkPut((backup.points ?? []).map(p => reviveDates(p, ['startedAt', 'endedAt'])))
    await db.events.bulkPut((backup.events ?? []).map(e => reviveDates(e, ['timestamp'])))
  })

  return backup.team
}

// JSON round-trips Dates as ISO strings; put them back.
function reviveDates<T extends object>(obj: T, keys: (keyof T)[]): T {
  const out = { ...obj }
  for (const k of keys) {
    const v = out[k]
    if (typeof v === 'string') out[k] = new Date(v) as T[keyof T]
  }
  return out
}
