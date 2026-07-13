export type EventType =
  | 'pickup'
  | 'pass'
  | 'goal'
  | 'throwaway'
  | 'drop'
  | 'stall'
  | 'D'
  | 'their_drop'
  | 'their_stall'
  | 'their_pass'
  | 'callahan'
  | 'their_goal'
  | 'penalty'
  | 'timeout'

export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
export type Gender = 'M' | 'F' | 'X'
export type LineType = 'O' | 'D'
export type ScoredBy = 'us' | 'them' | null
export type Possession = 'us' | 'them'

export interface Team {
  id: string
  name: string
  shortName: string
  createdAt: Date
  ownerId: string
}

export interface Player {
  id: string
  teamId: string
  name: string
  number: string
  gender: Gender
  active: boolean
}

export interface Game {
  id: string
  teamId: string
  opponent: string
  date: Date
  location?: string
  windDirection?: WindDirection | null
  isComplete: boolean
  ourScore: number
  theirScore: number
  targetScore?: number      // e.g. game to 15; drives halftime detection
  startingLine?: LineType   // did we start the game on O or D
  videoUrl?: string
  videoOffsetSeconds?: number
}

export interface Point {
  id: string
  gameId: string
  pointNumber: number
  line: LineType
  startedAt: Date
  endedAt?: Date
  playerIds: string[]
  scoredBy: ScoredBy
}

export interface GameEvent {
  id: string
  pointId: string
  gameId: string
  type: EventType
  throwerId?: string
  receiverId?: string
  timestamp: Date
  seq?: number              // monotonic per game; stable ordering when timestamps collide
  videoTimestamp?: number
  undone: boolean
}
