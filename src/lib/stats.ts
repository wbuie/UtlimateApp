import type { GameEvent, Point } from '../types'

// ── Plus / Minus ───────────────────────────────────────────────────────────
// +1 goal scored, +1 assist, +1 D block
// +2 callahan (+1 D + 1 goal)
// -1 drop (as receiver), -1 throwaway (as thrower)
// -1 for being callahaned (their callahan — you were the target)
export function calcPlusMinus(events: GameEvent[], playerId: string): number {
  let pm = 0
  for (const e of events) {
    if (e.undone) continue
    switch (e.type) {
      case 'goal':
        if (e.receiverId === playerId) pm += 1   // scored
        if (e.throwerId === playerId)  pm += 1   // assisted
        break
      case 'callahan':
        if (e.receiverId === playerId) pm += 2   // D + score
        if (e.throwerId === playerId)  pm -= 1   // you were callahaned (thrower had the disc)
        break
      case 'D':
        if (e.receiverId === playerId) pm += 1
        break
      case 'throwaway':
        if (e.throwerId === playerId)  pm -= 1
        break
      case 'drop':
        if (e.receiverId === playerId) pm -= 1
        break
    }
  }
  return pm
}

// ── Points Played ──────────────────────────────────────────────────────────
// 1.0 for full point, 0.5 if subbed in or out mid-point (player in playerIds at start).
// Simple version: player in point.playerIds = 1 point played.
export function calcPointsPlayed(points: Point[], playerId: string): number {
  return points
    .filter(p => p.endedAt && p.playerIds.includes(playerId))
    .length
}

// ── O-line Efficiency ──────────────────────────────────────────────────────
// For each O-line point the player was on:
//   +1 if we score, -1 if they score (break against)
// Total / O-line points on field
export function calcOEfficiency(
  points: Point[],
  events: GameEvent[],
  playerId: string,
): number {
  const oPoints = points.filter(p => p.endedAt && p.line === 'O' && p.playerIds.includes(playerId))
  if (!oPoints.length) return 0

  const eventsByPoint = groupEventsByPoint(events)
  let total = 0
  for (const pt of oPoints) {
    const ptEvents = eventsByPoint[pt.id] ?? []
    const scored = ptEvents.some(e => !e.undone && e.type === 'goal')
    const broke   = ptEvents.some(e => !e.undone && e.type === 'their_goal')
    if (scored) total += 1
    if (broke)  total -= 1
  }
  return oPoints.length ? total / oPoints.length : 0
}

// ── D-line Efficiency ──────────────────────────────────────────────────────
// For each D-line point the player was on:
//   +1 if we score (break), -1 if they score (hold)
export function calcDEfficiency(
  points: Point[],
  events: GameEvent[],
  playerId: string,
): number {
  const dPoints = points.filter(p => p.endedAt && p.line === 'D' && p.playerIds.includes(playerId))
  if (!dPoints.length) return 0

  const eventsByPoint = groupEventsByPoint(events)
  let total = 0
  for (const pt of dPoints) {
    const ptEvents = eventsByPoint[pt.id] ?? []
    const broke  = ptEvents.some(e => !e.undone && e.type === 'goal')
    const held   = ptEvents.some(e => !e.undone && e.type === 'their_goal')
    if (broke) total += 1
    if (held)  total -= 1
  }
  return dPoints.length ? total / dPoints.length : 0
}

// ── Throw % ────────────────────────────────────────────────────────────────
// (completions + turnovers - turnovers) / (completions + turnovers)
// = completions / (completions + turnovers)
// Note: drops are on the receiver, not the thrower.
export function calcThrowPct(events: GameEvent[], playerId: string): number {
  let completions = 0
  let turnovers = 0
  for (const e of events) {
    if (e.undone) continue
    if (e.throwerId !== playerId) continue
    if (e.type === 'pass' || e.type === 'goal' || e.type === 'callahan') completions += 1
    if (e.type === 'throwaway' || e.type === 'stall') turnovers += 1
  }
  const total = completions + turnovers
  return total ? completions / total : 0
}

// ── Catch % ───────────────────────────────────────────────────────────────
// catches / (catches + drops)
export function calcCatchPct(events: GameEvent[], playerId: string): number {
  let catches = 0
  let drops   = 0
  for (const e of events) {
    if (e.undone) continue
    if (e.receiverId !== playerId) continue
    if (e.type === 'pass' || e.type === 'goal' || e.type === 'callahan' || e.type === 'their_drop' || e.type === 'D') catches += 1
    if (e.type === 'drop') drops += 1
  }
  const total = catches + drops
  return total ? catches / total : 0
}

// ── Conversion Rate ────────────────────────────────────────────────────────
// goals (scored while on field) / (O-line points + turnover possessions while on field)
export function calcConversionRate(
  points: Point[],
  events: GameEvent[],
  playerId: string,
): number {
  const myPoints = points.filter(p => p.endedAt && p.playerIds.includes(playerId))
  const eventsByPoint = groupEventsByPoint(events)

  let opportunities = 0
  let goals = 0

  for (const pt of myPoints) {
    const ptEvents = (eventsByPoint[pt.id] ?? []).filter(e => !e.undone)

    if (pt.line === 'O') opportunities += 1  // O-line starts with possession

    // Count their turnovers as additional possession opportunities
    const theirTurnovers = ptEvents.filter(e =>
      e.type === 'their_drop' || e.type === 'their_stall' || e.type === 'D' || e.type === 'callahan'
    ).length
    opportunities += theirTurnovers

    if (ptEvents.some(e => e.type === 'goal' || e.type === 'callahan')) goals += 1
  }

  return opportunities ? goals / opportunities : 0
}

// ── Goals scored ──────────────────────────────────────────────────────────
export function calcGoals(events: GameEvent[], playerId: string): number {
  return events.filter(e => !e.undone && e.receiverId === playerId &&
    (e.type === 'goal' || e.type === 'callahan')).length
}

// ── Assists ───────────────────────────────────────────────────────────────
export function calcAssists(events: GameEvent[], playerId: string): number {
  return events.filter(e => !e.undone && e.throwerId === playerId &&
    (e.type === 'goal' || e.type === 'callahan')).length
}

// ── D blocks ──────────────────────────────────────────────────────────────
export function calcDBlocks(events: GameEvent[], playerId: string): number {
  return events.filter(e => !e.undone && e.receiverId === playerId && e.type === 'D').length
}

// ── Drops ─────────────────────────────────────────────────────────────────
export function calcDrops(events: GameEvent[], playerId: string): number {
  return events.filter(e => !e.undone && e.receiverId === playerId && e.type === 'drop').length
}

// ── Throwaways ─────────────────────────────────────────────────────────────
export function calcThrowaways(events: GameEvent[], playerId: string): number {
  return events.filter(e => !e.undone && e.throwerId === playerId &&
    (e.type === 'throwaway' || e.type === 'stall')).length
}

// ── Callahanss ─────────────────────────────────────────────────────────────
export function calcCallahanGoals(events: GameEvent[], playerId: string): number {
  return events.filter(e => !e.undone && e.receiverId === playerId && e.type === 'callahan').length
}

// ── Aggregate per-player stat row ─────────────────────────────────────────
export interface PlayerStatRow {
  playerId: string
  pointsPlayed: number
  goals: number
  assists: number
  dBlocks: number
  drops: number
  throwaways: number
  plusMinus: number
  throwPct: number
  catchPct: number
  oEff: number
  dEff: number
  conversionRate: number
  callahanGoals: number
}

export function calcPlayerStats(
  playerId: string,
  points: Point[],
  events: GameEvent[],
): PlayerStatRow {
  return {
    playerId,
    pointsPlayed:   calcPointsPlayed(points, playerId),
    goals:          calcGoals(events, playerId),
    assists:        calcAssists(events, playerId),
    dBlocks:        calcDBlocks(events, playerId),
    drops:          calcDrops(events, playerId),
    throwaways:     calcThrowaways(events, playerId),
    plusMinus:      calcPlusMinus(events, playerId),
    throwPct:       calcThrowPct(events, playerId),
    catchPct:       calcCatchPct(events, playerId),
    oEff:           calcOEfficiency(points, events, playerId),
    dEff:           calcDEfficiency(points, events, playerId),
    conversionRate: calcConversionRate(points, events, playerId),
    callahanGoals:  calcCallahanGoals(events, playerId),
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────
function groupEventsByPoint(events: GameEvent[]): Record<string, GameEvent[]> {
  const map: Record<string, GameEvent[]> = {}
  for (const e of events) {
    if (!map[e.pointId]) map[e.pointId] = []
    map[e.pointId].push(e)
  }
  return map
}
