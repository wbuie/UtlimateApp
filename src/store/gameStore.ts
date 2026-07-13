import { create } from 'zustand'
import type { Game, Point, GameEvent, Player, EventType, LineType } from '../types'
import { upsertEvent, upsertPoint, upsertGame, markEventUndone } from '../lib/db'
import { replayPointState, possessionForLineStart, suggestNextLine } from '../lib/pointState'
import type { Possession } from '../types'

function genId(): string {
  return crypto.randomUUID()
}

interface Toast {
  id: string
  message: string
}

interface GameState {
  // Current game context
  game: Game | null
  points: Point[]
  events: GameEvent[]
  activePlayers: Player[]     // full roster for this team
  onFieldPlayerIds: string[]  // 7 on the field right now
  currentPoint: Point | null  // null between points → line gate is showing

  // Live tracking state
  possession: Possession
  line: LineType
  discHolder: string | null   // player id who has the disc
  lastThrower: string | null  // for assist tracking on goal
  theirPassCount: number      // opponent passes on current defensive possession
  suggestedLine: LineType     // prefill for the next-point line gate
  halftimeReached: boolean    // the upcoming point starts the second half

  // UI state
  toasts: Toast[]
  playerPickerOpen: boolean
  playerPickerContext: 'D' | 'drop' | 'their_drop' | 'callahan' | null
  scoreFlash: 'us' | 'them' | null   // triggers score animation
  subModalOpen: boolean

  // Actions
  initGame: (game: Game, players: Player[], existingPoints: Point[], existingEvents: GameEvent[]) => void
  startPoint: (line: LineType, playerIds: string[]) => Promise<void>
  setOnField: (playerIds: string[]) => Promise<void>
  setLine: (line: LineType) => Promise<void>
  tapReceiver: (playerId: string) => Promise<void>
  logGoal: () => Promise<void>
  logThrowaway: () => Promise<void>
  logDrop: (playerId?: string) => Promise<void>
  logStall: () => Promise<void>
  logD: (playerId?: string) => Promise<void>
  logTheirDrop: (playerId?: string) => Promise<void>
  logTheirStall: () => Promise<void>
  logCallahan: (playerId: string) => Promise<void>
  logTheirGoal: () => Promise<void>
  logTheirPass: () => Promise<void>
  logPenalty: (playerId?: string) => Promise<void>
  logTimeout: () => Promise<void>
  endPoint: (scoredBy?: 'us' | 'them') => Promise<void>
  endGame: () => Promise<void>
  undoLast: () => Promise<void>
  openPlayerPicker: (ctx: GameState['playerPickerContext']) => void
  closePlayerPicker: () => void
  openSubModal: () => void
  closeSubModal: () => void
  clearScoreFlash: () => void
  addToast: (msg: string) => void
  dismissToast: (id: string) => void
}

const SCORING_EVENTS: EventType[] = ['goal', 'callahan', 'their_goal']

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  points: [],
  events: [],
  activePlayers: [],
  onFieldPlayerIds: [],
  currentPoint: null,
  possession: 'them',
  line: 'D',
  discHolder: null,
  lastThrower: null,
  theirPassCount: 0,
  suggestedLine: 'O',
  halftimeReached: false,
  toasts: [],
  playerPickerOpen: false,
  playerPickerContext: null,
  scoreFlash: null,
  subModalOpen: false,

  initGame(game, players, existingPoints, existingEvents) {
    const currentPoint = existingPoints.find(p => !p.endedAt) ?? null

    if (currentPoint) {
      // Resuming mid-point: rebuild live state from the point's events so a
      // reload at the field doesn't lose possession/line/roster.
      const pointEvents = existingEvents.filter(e => e.pointId === currentPoint.id)
      const live = replayPointState(currentPoint.line, pointEvents)
      set({
        game,
        activePlayers: players,
        points: existingPoints,
        events: existingEvents,
        currentPoint,
        onFieldPlayerIds: currentPoint.playerIds,
        line: currentPoint.line,
        suggestedLine: currentPoint.line,
        halftimeReached: false,
        ...live,
      })
      return
    }

    // Between points (or a fresh game): the line gate decides what's next.
    const lastPoint = [...existingPoints].sort((a, b) => a.pointNumber - b.pointNumber).at(-1)
    const suggestion = lastPoint
      ? suggestNextLine(game, lastPoint.scoredBy, lastPoint.line)
      : { line: game.startingLine ?? 'O', isHalftime: false }

    set({
      game,
      activePlayers: players,
      points: existingPoints,
      events: existingEvents,
      currentPoint: null,
      onFieldPlayerIds: lastPoint?.playerIds ?? [],
      possession: possessionForLineStart(suggestion.line),
      line: suggestion.line,
      suggestedLine: suggestion.line,
      halftimeReached: suggestion.isHalftime,
      discHolder: null,
      lastThrower: null,
      theirPassCount: 0,
    })
  },

  async startPoint(line, playerIds) {
    const { game, points } = get()
    if (!game || get().currentPoint) return

    const lastNumber = points.reduce((m, p) => Math.max(m, p.pointNumber), 0)
    const point: Point = {
      id: genId(),
      gameId: game.id,
      pointNumber: lastNumber + 1,
      line,
      startedAt: new Date(),
      playerIds,
      scoredBy: null,
    }
    await upsertPoint(point)

    // First point records how we started, so halftime can flip it later.
    let updatedGame = game
    if (point.pointNumber === 1 && game.startingLine !== line) {
      updatedGame = { ...game, startingLine: line }
      await upsertGame(updatedGame)
    }

    set({
      game: updatedGame,
      points: [...points, point],
      currentPoint: point,
      onFieldPlayerIds: playerIds,
      line,
      possession: possessionForLineStart(line),
      discHolder: null,
      lastThrower: null,
      theirPassCount: 0,
      halftimeReached: false,
    })
  },

  async setOnField(playerIds) {
    const { currentPoint, events } = get()
    set({ onFieldPlayerIds: playerIds })

    if (!currentPoint) return
    // Persist roster changes to the open point. Before any event it's a
    // correction (replace); after events it's a substitution, and everyone
    // who took the field gets credit for the point.
    const hasEvents = events.some(e => e.pointId === currentPoint.id && !e.undone)
    const merged = hasEvents
      ? [...new Set([...currentPoint.playerIds, ...playerIds])]
      : playerIds
    const updated = { ...currentPoint, playerIds: merged }
    await upsertPoint(updated)
    set(s => ({
      currentPoint: updated,
      points: s.points.map(p => p.id === updated.id ? updated : p),
    }))
  },

  async setLine(line) {
    const { currentPoint, events } = get()
    set({ line })

    if (!currentPoint) {
      set({ possession: possessionForLineStart(line), suggestedLine: line })
      return
    }
    // Correcting the open point's O/D label — persist it so efficiency
    // stats read the right line. Only reset possession if nothing has
    // happened yet this point.
    const updated = { ...currentPoint, line }
    await upsertPoint(updated)
    const hasEvents = events.some(e => e.pointId === currentPoint.id && !e.undone)
    set(s => ({
      currentPoint: updated,
      points: s.points.map(p => p.id === updated.id ? updated : p),
      ...(hasEvents ? {} : { possession: possessionForLineStart(line) }),
    }))
  },

  async tapReceiver(playerId) {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    if (!discHolder) {
      // First touch — pickup
      const evt = buildEvent(get, 'pickup', currentPoint.id, game.id, { receiverId: playerId })
      await upsertEvent(evt)
      set(s => ({ discHolder: playerId, possession: 'us', events: [...s.events, evt] }))
      get().addToast(`${playerName(get(), playerId)} picks up`)
    } else if (discHolder === playerId) {
      return // tapped same player, ignore
    } else {
      // Completed pass
      const evt = buildEvent(get, 'pass', currentPoint.id, game.id, { throwerId: discHolder, receiverId: playerId })
      await upsertEvent(evt)
      set(s => ({ lastThrower: discHolder, discHolder: playerId, events: [...s.events, evt] }))
    }
  },

  async logGoal() {
    const { discHolder, lastThrower, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'goal', currentPoint.id, game.id, {
      throwerId: lastThrower ?? undefined,
      receiverId: discHolder ?? undefined,
    })
    await upsertEvent(evt)

    const updatedGame: Game = { ...game, ourScore: game.ourScore + 1 }
    await upsertGame(updatedGame)

    set(s => ({ events: [...s.events, evt], game: updatedGame, scoreFlash: 'us' }))
    get().addToast('🏆 GOAL!')
    await get().endPoint('us')
  },

  async logThrowaway() {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'throwaway', currentPoint.id, game.id, { throwerId: discHolder ?? undefined })
    await upsertEvent(evt)
    set(s => ({
      events: [...s.events, evt],
      possession: 'them', discHolder: null, lastThrower: null, theirPassCount: 0,
    }))
    get().addToast('Throwaway — they have it')
  },

  async logDrop(playerId) {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'drop', currentPoint.id, game.id, { throwerId: discHolder ?? undefined, receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({
      events: [...s.events, evt],
      possession: 'them', discHolder: null, lastThrower: null, theirPassCount: 0,
    }))
    get().addToast('Drop — they have it')
  },

  async logStall() {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'stall', currentPoint.id, game.id, { throwerId: discHolder ?? undefined })
    await upsertEvent(evt)
    set(s => ({
      events: [...s.events, evt],
      possession: 'them', discHolder: null, lastThrower: null, theirPassCount: 0,
    }))
    get().addToast('Stall — they have it')
  },

  async logD(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'D', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({
      events: [...s.events, evt],
      possession: 'us', discHolder: playerId || null, lastThrower: null, theirPassCount: 0,
    }))
    get().addToast(playerId ? `D block — ${playerName(get(), playerId)} has it` : 'D block — we have it')
  },

  async logTheirPass() {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return
    const evt = buildEvent(get, 'their_pass', currentPoint.id, game.id, {})
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt], theirPassCount: s.theirPassCount + 1 }))
  },

  async logTheirDrop(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'their_drop', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({
      events: [...s.events, evt],
      possession: 'us', discHolder: playerId || null, lastThrower: null, theirPassCount: 0,
    }))
    get().addToast('Their drop — we have it')
  },

  async logTheirStall() {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'their_stall', currentPoint.id, game.id, {})
    await upsertEvent(evt)
    set(s => ({
      events: [...s.events, evt],
      possession: 'us', discHolder: null, lastThrower: null, theirPassCount: 0,
    }))
    get().addToast('Their stall — we have it')
  },

  async logCallahan(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'callahan', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)

    const updatedGame: Game = { ...game, ourScore: game.ourScore + 1 }
    await upsertGame(updatedGame)

    set(s => ({ events: [...s.events, evt], game: updatedGame, scoreFlash: 'us' }))
    get().addToast(`⚡ CALLAHAN — ${playerName(get(), playerId)}!`)
    await get().endPoint('us')
  },

  async logTheirGoal() {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'their_goal', currentPoint.id, game.id, {})
    await upsertEvent(evt)

    const updatedGame: Game = { ...game, theirScore: game.theirScore + 1 }
    await upsertGame(updatedGame)

    set(s => ({ events: [...s.events, evt], game: updatedGame, scoreFlash: 'them' }))
    get().addToast('Their goal')
    await get().endPoint('them')
  },

  async logPenalty(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'penalty', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt] }))
    get().addToast('Penalty / foul recorded')
  },

  async logTimeout() {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent(get, 'timeout', currentPoint.id, game.id, {})
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt] }))
    get().addToast('Timeout')
  },

  async endPoint(scoredBy?: 'us' | 'them') {
    const { currentPoint, game, line } = get()
    if (!game || !currentPoint) return

    const closedPoint: Point = { ...currentPoint, endedAt: new Date(), scoredBy: scoredBy ?? null }
    await upsertPoint(closedPoint)

    // The next point isn't created until the coach confirms the line —
    // currentPoint: null puts the tracker on the line gate.
    const suggestion = suggestNextLine(get().game ?? game, scoredBy ?? null, line)
    if (suggestion.isHalftime) get().addToast('🕐 Halftime')

    set(s => ({
      points: s.points.map(p => p.id === closedPoint.id ? closedPoint : p),
      currentPoint: null,
      discHolder: null,
      lastThrower: null,
      theirPassCount: 0,
      suggestedLine: suggestion.line,
      halftimeReached: suggestion.isHalftime,
      possession: possessionForLineStart(suggestion.line),
      line: suggestion.line,
    }))
  },

  async undoLast() {
    const { events, game, currentPoint, points } = get()
    if (!game) return
    const active = events.filter(e => !e.undone)
    if (!active.length) return

    const last = active[active.length - 1]

    // Undoing a score reopens the point it closed (we're on the line gate,
    // the point already has endedAt/scoredBy and the score was bumped).
    if (SCORING_EVENTS.includes(last.type) && !currentPoint) {
      const scoredPoint = points.find(p => p.id === last.pointId)
      if (!scoredPoint) return

      await markEventUndone(last.id)

      let updatedGame = game
      if (last.type === 'goal' || last.type === 'callahan') {
        updatedGame = { ...game, ourScore: Math.max(0, game.ourScore - 1) }
      } else {
        updatedGame = { ...game, theirScore: Math.max(0, game.theirScore - 1) }
      }
      await upsertGame(updatedGame)

      const reopened: Point = { ...scoredPoint, endedAt: undefined, scoredBy: null }
      await upsertPoint(reopened)

      const remaining = events
        .map(e => e.id === last.id ? { ...e, undone: true } : e)
      const live = replayPointState(reopened.line, remaining.filter(e => e.pointId === reopened.id))

      set(s => ({
        events: remaining,
        game: updatedGame,
        currentPoint: reopened,
        points: s.points.map(p => p.id === reopened.id ? reopened : p),
        onFieldPlayerIds: reopened.playerIds,
        line: reopened.line,
        halftimeReached: false,
        ...live,
      }))
      get().addToast('Score undone — point reopened')
      return
    }

    if (!currentPoint) return // nothing undoable from the line gate otherwise

    // Regular undo: mark the event undone and rebuild live state from what's
    // left of the current point, so possession/disc/pass-count all stay honest.
    if (last.pointId !== currentPoint.id) return
    await markEventUndone(last.id)

    const remaining = events.map(e => e.id === last.id ? { ...e, undone: true } : e)
    const live = replayPointState(currentPoint.line, remaining.filter(e => e.pointId === currentPoint.id))

    set({ events: remaining, ...live })
    get().addToast('Undone')
  },

  async endGame() {
    const { game, currentPoint } = get()
    if (!game) return
    if (currentPoint && !currentPoint.endedAt) {
      const closed = { ...currentPoint, endedAt: new Date() }
      await upsertPoint(closed)
      set(s => ({ points: s.points.map(p => p.id === closed.id ? closed : p) }))
    }
    const updatedGame: Game = { ...game, isComplete: true }
    await upsertGame(updatedGame)
    set({ game: updatedGame, currentPoint: null })
    get().addToast('Game complete!')
  },

  openPlayerPicker(ctx) {
    set({ playerPickerOpen: true, playerPickerContext: ctx })
  },

  closePlayerPicker() {
    set({ playerPickerOpen: false, playerPickerContext: null })
  },

  openSubModal() {
    set({ subModalOpen: true })
  },

  closeSubModal() {
    set({ subModalOpen: false })
  },

  clearScoreFlash() {
    set({ scoreFlash: null })
  },

  addToast(message) {
    const id = genId()
    set(s => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => get().dismissToast(id), 2500)
  },

  dismissToast(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))

// ── Helpers ────────────────────────────────────────────

function buildEvent(
  get: () => GameState,
  type: EventType,
  pointId: string,
  gameId: string,
  opts: { throwerId?: string; receiverId?: string },
): GameEvent {
  const maxSeq = get().events.reduce((m, e) => Math.max(m, e.seq ?? 0), 0)
  return {
    id: genId(),
    pointId,
    gameId,
    type,
    // '' comes from "Skip / Unknown" pickers — normalize to undefined
    throwerId: opts.throwerId || undefined,
    receiverId: opts.receiverId || undefined,
    timestamp: new Date(),
    seq: maxSeq + 1,
    undone: false,
  }
}

function playerName(state: GameState, id: string): string {
  return state.activePlayers.find(p => p.id === id)?.name ?? '#?'
}
