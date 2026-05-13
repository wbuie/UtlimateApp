import { create } from 'zustand'
import type { Game, Point, GameEvent, Player, EventType, LineType, Possession } from '../types'
import { upsertEvent, upsertPoint, upsertGame, markEventUndone } from '../lib/db'

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
  currentPoint: Point | null

  // Live tracking state
  possession: Possession
  line: LineType
  discHolder: string | null   // player id who has the disc
  lastThrower: string | null  // for assist tracking on goal

  // UI state
  toasts: Toast[]
  playerPickerOpen: boolean
  playerPickerContext: 'D' | 'drop' | 'their_drop' | 'callahan' | 'their_stall' | null
  pointStartTime: Date | null
  scoreFlash: 'us' | 'them' | null   // triggers score animation
  subModalOpen: boolean

  // Actions
  initGame: (game: Game, players: Player[], existingPoints: Point[], existingEvents: GameEvent[]) => void
  setOnField: (playerIds: string[]) => void
  setLine: (line: LineType) => void
  tapReceiver: (playerId: string) => Promise<void>
  logGoal: () => Promise<void>
  logThrowaway: () => Promise<void>
  logDrop: (playerId: string) => Promise<void>
  logStall: () => Promise<void>
  logD: (playerId: string) => Promise<void>
  logTheirDrop: (playerId?: string) => Promise<void>
  logTheirStall: () => Promise<void>
  logCallahan: (playerId: string) => Promise<void>
  logTheirGoal: () => Promise<void>
  logPenalty: (playerId?: string) => Promise<void>
  endPoint: () => Promise<void>
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

const TURNOVER_EVENTS: EventType[] = ['throwaway', 'drop', 'stall', 'D', 'their_drop', 'their_stall']

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
  toasts: [],
  playerPickerOpen: false,
  playerPickerContext: null,
  pointStartTime: null,
  scoreFlash: null,
  subModalOpen: false,

  initGame(game, players, existingPoints, existingEvents) {
    const currentPoint = existingPoints.find(p => !p.endedAt) ?? null
    set({
      game,
      activePlayers: players,
      points: existingPoints,
      events: existingEvents,
      currentPoint,
      possession: 'them',
      line: currentPoint?.line ?? 'D',
      discHolder: null,
      lastThrower: null,
    })
  },

  setOnField(playerIds) {
    set({ onFieldPlayerIds: playerIds })
  },

  setLine(line) {
    set({ line })
  },

  async tapReceiver(playerId) {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    if (discHolder === null) {
      // First touch — pickup
      const evt = buildEvent('pickup', currentPoint.id, game.id, { receiverId: playerId })
      await upsertEvent(evt)
      set(s => ({ discHolder: playerId, events: [...s.events, evt] }))
      get().addToast(`${playerName(get(), playerId)} picks up`)
    } else if (discHolder === playerId) {
      return // tapped same player, ignore
    } else {
      // Completed pass
      const evt = buildEvent('pass', currentPoint.id, game.id, { throwerId: discHolder, receiverId: playerId })
      await upsertEvent(evt)
      set(s => ({ lastThrower: discHolder, discHolder: playerId, events: [...s.events, evt] }))
    }
  },

  async logGoal() {
    const { discHolder, lastThrower, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('goal', currentPoint.id, game.id, {
      throwerId: lastThrower ?? undefined,
      receiverId: discHolder ?? undefined,
    })
    await upsertEvent(evt)

    const updatedGame: Game = { ...game, ourScore: game.ourScore + 1 }
    await upsertGame(updatedGame)

    set(s => ({ events: [...s.events, evt], game: updatedGame, scoreFlash: 'us' }))
    get().addToast('🏆 GOAL!')
    await get().endPoint()
  },

  async logThrowaway() {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('throwaway', currentPoint.id, game.id, { throwerId: discHolder ?? undefined })
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt], discHolder: null, lastThrower: null }))
    swapPossession(set)
    get().addToast('Throwaway — they have it')
  },

  async logDrop(playerId) {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('drop', currentPoint.id, game.id, { throwerId: discHolder ?? undefined, receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt], discHolder: null, lastThrower: null }))
    swapPossession(set)
    get().addToast(`Drop — they have it`)
  },

  async logStall() {
    const { discHolder, currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('stall', currentPoint.id, game.id, { throwerId: discHolder ?? undefined })
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt], discHolder: null, lastThrower: null }))
    swapPossession(set)
    get().addToast('Stall — they have it')
  },

  async logD(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('D', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt], discHolder: playerId, lastThrower: null }))
    swapPossession(set)
    get().addToast(`D block — ${playerName(get(), playerId)} has it`)
  },

  async logTheirDrop(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('their_drop', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt], discHolder: playerId ?? null, lastThrower: null }))
    swapPossession(set)
    get().addToast('Their drop — we have it')
  },

  async logTheirStall() {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('their_stall', currentPoint.id, game.id, {})
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt], discHolder: null, lastThrower: null }))
    swapPossession(set)
    get().addToast('Their stall — we have it')
  },

  async logCallahan(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('callahan', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)

    const updatedGame: Game = { ...game, ourScore: game.ourScore + 1 }
    await upsertGame(updatedGame)

    set(s => ({ events: [...s.events, evt], game: updatedGame, scoreFlash: 'us' }))
    get().addToast(`⚡ CALLAHAN — ${playerName(get(), playerId)}!`)
    await get().endPoint()
  },

  async logTheirGoal() {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('their_goal', currentPoint.id, game.id, {})
    await upsertEvent(evt)

    const updatedGame: Game = { ...game, theirScore: game.theirScore + 1 }
    await upsertGame(updatedGame)

    set(s => ({ events: [...s.events, evt], game: updatedGame, scoreFlash: 'them' }))
    get().addToast('Their goal')
    await get().endPoint()
  },

  async logPenalty(playerId) {
    const { currentPoint, game } = get()
    if (!game || !currentPoint) return

    const evt = buildEvent('penalty', currentPoint.id, game.id, { receiverId: playerId })
    await upsertEvent(evt)
    set(s => ({ events: [...s.events, evt] }))
    get().addToast('Penalty / foul recorded')
  },

  async endPoint() {
    const { currentPoint, points, line, onFieldPlayerIds, game } = get()
    if (!game || !currentPoint) return

    const now = new Date()
    const closedPoint: Point = { ...currentPoint, endedAt: now }
    await upsertPoint(closedPoint)

    const nextLine: LineType = line  // keep same line for now
    const nextPoint: Point = {
      id: genId(),
      gameId: game.id,
      pointNumber: currentPoint.pointNumber + 1,
      line: nextLine,
      startedAt: now,
      playerIds: onFieldPlayerIds,
      scoredBy: null,
    }
    await upsertPoint(nextPoint)

    set({
      points: [...points.filter(p => p.id !== currentPoint.id), closedPoint],
      currentPoint: nextPoint,
      discHolder: null,
      lastThrower: null,
      possession: 'them',
      pointStartTime: now,
    })
  },

  async undoLast() {
    const { events, game } = get()
    const active = events.filter(e => !e.undone)
    if (!active.length || !game) return

    const last = active[active.length - 1]
    await markEventUndone(last.id)

    // Reverse score if needed
    let updatedGame = game
    if (last.type === 'goal') updatedGame = { ...game, ourScore: Math.max(0, game.ourScore - 1) }
    if (last.type === 'callahan') updatedGame = { ...game, ourScore: Math.max(0, game.ourScore - 1) }
    if (last.type === 'their_goal') updatedGame = { ...game, theirScore: Math.max(0, game.theirScore - 1) }
    if (updatedGame !== game) await upsertGame(updatedGame)

    // Restore disc state from second-to-last active event
    const remaining = active.slice(0, -1)
    const prev = remaining[remaining.length - 1]
    const newDiscHolder = prev?.receiverId ?? prev?.throwerId ?? null
    const newLastThrower = prev?.throwerId ?? null

    // Restore possession — if last event was a turnover, flip back
    const wasTurnover = TURNOVER_EVENTS.includes(last.type)

    set(s => ({
      events: s.events.map(e => e.id === last.id ? { ...e, undone: true } : e),
      game: updatedGame,
      discHolder: newDiscHolder,
      lastThrower: newLastThrower,
      ...(wasTurnover ? { possession: s.possession === 'us' ? 'them' : 'us' } : {}),
    }))
    get().addToast('Undone')
  },

  async endGame() {
    const { game, currentPoint } = get()
    if (!game) return
    const now = new Date()
    if (currentPoint && !currentPoint.endedAt) {
      const closed = { ...currentPoint, endedAt: now }
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
  type: EventType,
  pointId: string,
  gameId: string,
  opts: { throwerId?: string; receiverId?: string },
): GameEvent {
  return {
    id: genId(),
    pointId,
    gameId,
    type,
    throwerId: opts.throwerId,
    receiverId: opts.receiverId,
    timestamp: new Date(),
    undone: false,
  }
}

function swapPossession(set: (fn: (s: GameState) => Partial<GameState>) => void) {
  set(s => ({ possession: s.possession === 'us' ? 'them' : 'us' }))
}

function playerName(state: GameState, id: string): string {
  return state.activePlayers.find(p => p.id === id)?.name ?? '#?'
}
