import { describe, it, expect } from 'vitest'
import {
  calcPlusMinus, calcPointsPlayed, calcThrowPct, calcCatchPct,
  calcGoals, calcAssists, calcDBlocks, calcDrops, calcThrowaways,
  calcOEfficiency, calcDEfficiency,
} from '../lib/stats'
import type { GameEvent, Point } from '../types'

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

function pt(overrides: Partial<Point>): Point {
  return {
    id: 'p1',
    gameId: 'g1',
    pointNumber: 1,
    line: 'O',
    startedAt: new Date(),
    endedAt: new Date(),
    playerIds: ['alice'],
    scoredBy: null,
    ...overrides,
  }
}

describe('calcPlusMinus', () => {
  it('counts +1 for goal scored', () => {
    const events = [evt({ type: 'goal', receiverId: 'alice' })]
    expect(calcPlusMinus(events, 'alice')).toBe(1)
  })

  it('counts +1 for assist', () => {
    const events = [evt({ type: 'goal', throwerId: 'alice', receiverId: 'bob' })]
    expect(calcPlusMinus(events, 'alice')).toBe(1)
  })

  it('counts +2 for callahan', () => {
    const events = [evt({ type: 'callahan', receiverId: 'alice' })]
    expect(calcPlusMinus(events, 'alice')).toBe(2)
  })

  it('counts -1 for being callahaned', () => {
    const events = [evt({ type: 'callahan', throwerId: 'alice', receiverId: 'bob' })]
    expect(calcPlusMinus(events, 'alice')).toBe(-1)
  })

  it('counts -1 for throwaway', () => {
    const events = [evt({ type: 'throwaway', throwerId: 'alice' })]
    expect(calcPlusMinus(events, 'alice')).toBe(-1)
  })

  it('counts -1 for drop', () => {
    const events = [evt({ type: 'drop', receiverId: 'alice' })]
    expect(calcPlusMinus(events, 'alice')).toBe(-1)
  })

  it('skips undone events', () => {
    const events = [evt({ type: 'goal', receiverId: 'alice', undone: true })]
    expect(calcPlusMinus(events, 'alice')).toBe(0)
  })

  it('compound: goal + assist + D', () => {
    const events = [
      evt({ type: 'goal', receiverId: 'alice' }),
      evt({ type: 'goal', throwerId: 'alice', receiverId: 'bob' }),
      evt({ type: 'D', receiverId: 'alice' }),
    ]
    expect(calcPlusMinus(events, 'alice')).toBe(3)
  })
})

describe('calcPointsPlayed', () => {
  it('counts completed points with player', () => {
    const points = [
      pt({ id: 'p1', playerIds: ['alice'], endedAt: new Date() }),
      pt({ id: 'p2', playerIds: ['alice', 'bob'], endedAt: new Date() }),
      pt({ id: 'p3', playerIds: ['bob'], endedAt: new Date() }),
    ]
    expect(calcPointsPlayed(points, 'alice')).toBe(2)
  })

  it('does not count open points', () => {
    const points = [pt({ playerIds: ['alice'], endedAt: undefined })]
    expect(calcPointsPlayed(points, 'alice')).toBe(0)
  })
})

describe('calcThrowPct', () => {
  it('100% with all completions', () => {
    const events = [
      evt({ type: 'pass', throwerId: 'alice' }),
      evt({ type: 'pass', throwerId: 'alice' }),
      evt({ type: 'goal', throwerId: 'alice' }),
    ]
    expect(calcThrowPct(events, 'alice')).toBe(1)
  })

  it('calculates with turnovers', () => {
    const events = [
      evt({ type: 'pass', throwerId: 'alice' }),
      evt({ type: 'throwaway', throwerId: 'alice' }),
    ]
    expect(calcThrowPct(events, 'alice')).toBe(0.5)
  })

  it('returns 0 with no throws', () => {
    expect(calcThrowPct([], 'alice')).toBe(0)
  })
})

describe('calcCatchPct', () => {
  it('100% with all catches', () => {
    const events = [
      evt({ type: 'pass', receiverId: 'alice' }),
      evt({ type: 'goal', receiverId: 'alice' }),
    ]
    expect(calcCatchPct(events, 'alice')).toBe(1)
  })

  it('calculates with drops', () => {
    const events = [
      evt({ type: 'pass', receiverId: 'alice' }),
      evt({ type: 'drop', receiverId: 'alice' }),
    ]
    expect(calcCatchPct(events, 'alice')).toBe(0.5)
  })
})

describe('calcOEfficiency', () => {
  it('+1 for O-line goal', () => {
    const points = [pt({ id: 'p1', line: 'O', playerIds: ['alice'], endedAt: new Date() })]
    const events = [evt({ pointId: 'p1', type: 'goal', receiverId: 'alice' })]
    expect(calcOEfficiency(points, events, 'alice')).toBeCloseTo(1)
  })

  it('-1 for O-line break against', () => {
    const points = [pt({ id: 'p1', line: 'O', playerIds: ['alice'], endedAt: new Date() })]
    const events = [evt({ pointId: 'p1', type: 'their_goal' })]
    expect(calcOEfficiency(points, events, 'alice')).toBeCloseTo(-1)
  })

  it('0 for D-line points', () => {
    const points = [pt({ id: 'p1', line: 'D', playerIds: ['alice'], endedAt: new Date() })]
    const events = [evt({ pointId: 'p1', type: 'goal' })]
    expect(calcOEfficiency(points, events, 'alice')).toBe(0)
  })
})

describe('calcDEfficiency', () => {
  it('+1 for D-line break', () => {
    const points = [pt({ id: 'p1', line: 'D', playerIds: ['alice'], endedAt: new Date() })]
    const events = [evt({ pointId: 'p1', type: 'goal' })]
    expect(calcDEfficiency(points, events, 'alice')).toBeCloseTo(1)
  })

  it('-1 for D-line hold (they score)', () => {
    const points = [pt({ id: 'p1', line: 'D', playerIds: ['alice'], endedAt: new Date() })]
    const events = [evt({ pointId: 'p1', type: 'their_goal' })]
    expect(calcDEfficiency(points, events, 'alice')).toBeCloseTo(-1)
  })
})

describe('counting helpers', () => {
  it('calcGoals', () => {
    const events = [evt({ type: 'goal', receiverId: 'alice' }), evt({ type: 'callahan', receiverId: 'alice' })]
    expect(calcGoals(events, 'alice')).toBe(2)
  })

  it('calcAssists', () => {
    const events = [evt({ type: 'goal', throwerId: 'alice', receiverId: 'bob' })]
    expect(calcAssists(events, 'alice')).toBe(1)
  })

  it('calcDBlocks', () => {
    const events = [evt({ type: 'D', receiverId: 'alice' })]
    expect(calcDBlocks(events, 'alice')).toBe(1)
  })

  it('calcDrops', () => {
    const events = [evt({ type: 'drop', receiverId: 'alice' })]
    expect(calcDrops(events, 'alice')).toBe(1)
  })

  it('calcThrowaways', () => {
    const events = [evt({ type: 'throwaway', throwerId: 'alice' }), evt({ type: 'stall', throwerId: 'alice' })]
    expect(calcThrowaways(events, 'alice')).toBe(2)
  })
})
