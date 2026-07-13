import type { GameEvent, LineType, Possession, Game } from '../types'

// Live tracking state that can be reconstructed from a point's events.
// Used when resuming a game mid-point and after undo, so the tracker
// never trusts stale in-memory state.
export interface LivePointState {
  possession: Possession
  discHolder: string | null
  lastThrower: string | null
  theirPassCount: number
}

// On O-line we receive the pull, so the disc is ours from the start
// (discHolder stays null until the pickup is tapped).
export function possessionForLineStart(line: LineType): Possession {
  return line === 'O' ? 'us' : 'them'
}

export function replayPointState(line: LineType, events: GameEvent[]): LivePointState {
  const state: LivePointState = {
    possession: possessionForLineStart(line),
    discHolder: null,
    lastThrower: null,
    theirPassCount: 0,
  }

  for (const e of events) {
    if (e.undone) continue
    switch (e.type) {
      case 'pickup':
        state.possession = 'us'
        state.discHolder = e.receiverId ?? null
        state.lastThrower = null
        break
      case 'pass':
        state.discHolder = e.receiverId ?? null
        state.lastThrower = e.throwerId ?? null
        break
      case 'throwaway':
      case 'drop':
      case 'stall':
        state.possession = 'them'
        state.discHolder = null
        state.lastThrower = null
        state.theirPassCount = 0
        break
      case 'D':
      case 'their_drop':
        state.possession = 'us'
        state.discHolder = e.receiverId ?? null
        state.lastThrower = null
        state.theirPassCount = 0
        break
      case 'their_stall':
        state.possession = 'us'
        state.discHolder = null
        state.lastThrower = null
        state.theirPassCount = 0
        break
      case 'their_pass':
        state.theirPassCount += 1
        break
      // goal / callahan / their_goal close the point; penalty and timeout
      // don't change possession
      default:
        break
    }
  }
  return state
}

// ── Next-point line suggestion ──────────────────────────────────────────────
// Standard alternation: the team that was scored on receives (plays O).
// Halftime: the team that received the opening pull pulls to start the
// second half, so the first point after half restarts from the opposite of
// the game's starting line — regardless of who scored the last point.
export interface NextLineSuggestion {
  line: LineType
  isHalftime: boolean
}

export function suggestNextLine(
  game: Pick<Game, 'ourScore' | 'theirScore' | 'targetScore' | 'startingLine'>,
  scoredBy: 'us' | 'them' | null,
  currentLine: LineType,
): NextLineSuggestion {
  // Manual point end with no score: keep the current line.
  if (!scoredBy) return { line: currentLine, isHalftime: false }

  // Halftime happens exactly once: when the first team reaches half the
  // target. If the other team already got there, half is behind us.
  const halfAt = game.targetScore ? Math.ceil(game.targetScore / 2) : null
  const atHalf =
    halfAt !== null &&
    (scoredBy === 'us'
      ? game.ourScore === halfAt && game.theirScore < halfAt
      : game.theirScore === halfAt && game.ourScore < halfAt)

  if (atHalf && game.startingLine) {
    return { line: game.startingLine === 'O' ? 'D' : 'O', isHalftime: true }
  }

  // We scored → we pull → D next. They scored → we receive → O next.
  return { line: scoredBy === 'us' ? 'D' : 'O', isHalftime: false }
}
