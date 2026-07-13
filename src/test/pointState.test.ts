import { describe, it, expect } from 'vitest'
import { replayPointState, possessionForLineStart, suggestNextLine } from '../lib/pointState'
import type { GameEvent } from '../types'

function evt(overrides: Partial<GameEvent>): GameEvent {
  return {
    id: Math.random().toString(),
    pointId: 'p1',
    gameId: 'g1',
    type: 'pass',
    timestamp: new Date(),
    undone: false,
    ...overrides,
  }
}

describe('possessionForLineStart', () => {
  it('O-line starts with us receiving', () => {
    expect(possessionForLineStart('O')).toBe('us')
  })
  it('D-line starts with them', () => {
    expect(possessionForLineStart('D')).toBe('them')
  })
})

describe('replayPointState', () => {
  it('fresh O point: our possession, no disc holder yet', () => {
    const s = replayPointState('O', [])
    expect(s).toEqual({ possession: 'us', discHolder: null, lastThrower: null, theirPassCount: 0 })
  })

  it('pickup then passes tracks the disc', () => {
    const s = replayPointState('O', [
      evt({ type: 'pickup', receiverId: 'alice' }),
      evt({ type: 'pass', throwerId: 'alice', receiverId: 'bob' }),
      evt({ type: 'pass', throwerId: 'bob', receiverId: 'carol' }),
    ])
    expect(s.possession).toBe('us')
    expect(s.discHolder).toBe('carol')
    expect(s.lastThrower).toBe('bob')
  })

  it('our turnover flips possession and clears the disc', () => {
    const s = replayPointState('O', [
      evt({ type: 'pickup', receiverId: 'alice' }),
      evt({ type: 'throwaway', throwerId: 'alice' }),
    ])
    expect(s.possession).toBe('them')
    expect(s.discHolder).toBeNull()
    expect(s.lastThrower).toBeNull()
  })

  it('D block gives us the disc with the defender holding it', () => {
    const s = replayPointState('D', [
      evt({ type: 'their_pass' }),
      evt({ type: 'their_pass' }),
      evt({ type: 'D', receiverId: 'dana' }),
    ])
    expect(s.possession).toBe('us')
    expect(s.discHolder).toBe('dana')
    expect(s.theirPassCount).toBe(0)
  })

  it('their pass count accumulates and undone events are skipped', () => {
    const s = replayPointState('D', [
      evt({ type: 'their_pass' }),
      evt({ type: 'their_pass' }),
      evt({ type: 'their_pass', undone: true }),
    ])
    expect(s.theirPassCount).toBe(2)
  })

  it('undoing a turnover mid-replay restores our possession state', () => {
    // pickup → pass → throwaway(undone) replays back to bob holding it
    const s = replayPointState('O', [
      evt({ type: 'pickup', receiverId: 'alice' }),
      evt({ type: 'pass', throwerId: 'alice', receiverId: 'bob' }),
      evt({ type: 'throwaway', throwerId: 'bob', undone: true }),
    ])
    expect(s.possession).toBe('us')
    expect(s.discHolder).toBe('bob')
    expect(s.lastThrower).toBe('alice')
  })

  it('penalty and timeout leave possession untouched', () => {
    const s = replayPointState('O', [
      evt({ type: 'pickup', receiverId: 'alice' }),
      evt({ type: 'penalty', receiverId: 'bob' }),
      evt({ type: 'timeout' }),
    ])
    expect(s.possession).toBe('us')
    expect(s.discHolder).toBe('alice')
  })
})

describe('suggestNextLine', () => {
  const base = { ourScore: 3, theirScore: 2, targetScore: 15, startingLine: 'O' as const }

  it('we scored → we pull → D next', () => {
    expect(suggestNextLine(base, 'us', 'O')).toEqual({ line: 'D', isHalftime: false })
  })

  it('they scored → we receive → O next', () => {
    expect(suggestNextLine(base, 'them', 'D')).toEqual({ line: 'O', isHalftime: false })
  })

  it('manual end with no score keeps the current line', () => {
    expect(suggestNextLine(base, null, 'D')).toEqual({ line: 'D', isHalftime: false })
  })

  it('reaching half flips to the opposite of the starting line', () => {
    // game to 15 → half at 8; we started O so second half starts D... but we
    // received the opening pull, so we pull after half → D
    const g = { ourScore: 8, theirScore: 5, targetScore: 15, startingLine: 'O' as const }
    expect(suggestNextLine(g, 'us', 'O')).toEqual({ line: 'D', isHalftime: true })
  })

  it('halftime flip when they reach half: we started D → O after half', () => {
    const g = { ourScore: 4, theirScore: 8, targetScore: 15, startingLine: 'D' as const }
    expect(suggestNextLine(g, 'them', 'D')).toEqual({ line: 'O', isHalftime: true })
  })

  it('no halftime flip when the other team is already past half', () => {
    // they hit 8 first (halftime happened then); us reaching 8 later is not a second half
    const g = { ourScore: 8, theirScore: 10, targetScore: 15, startingLine: 'O' as const }
    expect(suggestNextLine(g, 'them', 'O')).toEqual({ line: 'O', isHalftime: false })
  })

  it('no second flip when we reach half after they already did', () => {
    // they hit 8 first; later we tie it 8–8 — halftime must not re-trigger
    const g = { ourScore: 8, theirScore: 8, targetScore: 15, startingLine: 'O' as const }
    expect(suggestNextLine(g, 'us', 'O')).toEqual({ line: 'D', isHalftime: false })
  })

  it('no target score → standard alternation only', () => {
    const g = { ourScore: 8, theirScore: 5, targetScore: undefined, startingLine: 'O' as const }
    expect(suggestNextLine(g, 'us', 'O')).toEqual({ line: 'D', isHalftime: false })
  })
})
