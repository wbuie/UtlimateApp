import { describe, it, expect } from 'vitest'
import {
  teamToRow, rowToTeam, playerToRow, rowToPlayer,
  gameToRow, rowToGame, pointToRow, rowToPoint, eventToRow, rowToEvent,
} from '../lib/remote'
import type { Team, Player, Game, Point, GameEvent } from '../types'

// Round-trip: local shape → supabase row → local shape must be lossless
// (modulo server-managed fields like owner_id).

describe('remote row mappers', () => {
  it('team round-trips', () => {
    const t: Team = { id: crypto.randomUUID(), name: 'Rain', shortName: 'PDX', createdAt: new Date('2026-05-01T10:00:00Z'), ownerId: 'local' }
    const back = rowToTeam({ ...teamToRow(t), owner_id: 'local' })
    expect(back).toEqual(t)
  })

  it('player round-trips', () => {
    const p: Player = { id: crypto.randomUUID(), teamId: crypto.randomUUID(), name: 'Alice', number: '7', gender: 'F', active: true }
    expect(rowToPlayer(playerToRow(p))).toEqual(p)
  })

  it('game round-trips with optional fields present', () => {
    const g: Game = {
      id: crypto.randomUUID(), teamId: crypto.randomUUID(), opponent: 'Sockeye',
      date: new Date('2026-06-07T18:30:00Z'), location: 'Field 3', windDirection: 'NW',
      targetScore: 15, startingLine: 'O', isComplete: true, ourScore: 15, theirScore: 12,
    }
    expect(rowToGame(gameToRow(g))).toEqual(g)
  })

  it('game round-trips with optional fields absent', () => {
    const g: Game = {
      id: crypto.randomUUID(), teamId: crypto.randomUUID(), opponent: 'Unknown',
      date: new Date('2026-06-07T18:30:00Z'), windDirection: null,
      isComplete: false, ourScore: 0, theirScore: 0,
    }
    const back = rowToGame(gameToRow(g))
    expect(back.location).toBeUndefined()
    expect(back.targetScore).toBeUndefined()
    expect(back.startingLine).toBeUndefined()
    expect(back.id).toBe(g.id)
  })

  it('point round-trips including open points (no endedAt)', () => {
    const open: Point = {
      id: crypto.randomUUID(), gameId: crypto.randomUUID(), pointNumber: 3, line: 'D',
      startedAt: new Date('2026-06-07T19:00:00Z'), playerIds: [crypto.randomUUID(), crypto.randomUUID()],
      scoredBy: null,
    }
    const back = rowToPoint(pointToRow(open))
    expect(back.endedAt).toBeUndefined()
    expect(back).toEqual(open)

    const closed: Point = { ...open, endedAt: new Date('2026-06-07T19:04:00Z'), scoredBy: 'us' }
    expect(rowToPoint(pointToRow(closed))).toEqual(closed)
  })

  it('event round-trips', () => {
    const e: GameEvent = {
      id: crypto.randomUUID(), pointId: crypto.randomUUID(), gameId: crypto.randomUUID(),
      type: 'pass', throwerId: crypto.randomUUID(), receiverId: crypto.randomUUID(),
      timestamp: new Date('2026-06-07T19:01:23.456Z'), seq: 42, undone: false,
    }
    expect(rowToEvent(eventToRow(e))).toEqual(e)
  })

  it('event with no players round-trips to undefined ids (not null)', () => {
    const e: GameEvent = {
      id: crypto.randomUUID(), pointId: crypto.randomUUID(), gameId: crypto.randomUUID(),
      type: 'their_pass', timestamp: new Date(), undone: false,
    }
    const back = rowToEvent(eventToRow(e))
    expect(back.throwerId).toBeUndefined()
    expect(back.receiverId).toBeUndefined()
  })
})
