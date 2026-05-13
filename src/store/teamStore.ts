import { create } from 'zustand'
import type { Team, Player, Game } from '../types'
import {
  getTeams, upsertTeam, deleteTeam as dbDeleteTeam,
  getPlayers, upsertPlayer, deletePlayer as dbDeletePlayer,
  getGames, upsertGame, deleteGame as dbDeleteGame,
} from '../lib/db'

function genId(): string {
  return crypto.randomUUID()
}

interface TeamState {
  teams: Team[]
  players: Record<string, Player[]>   // keyed by teamId
  games: Record<string, Game[]>       // keyed by teamId
  loading: boolean

  loadTeams: () => Promise<void>
  createTeam: (name: string, shortName: string) => Promise<Team>
  updateTeam: (team: Team) => Promise<void>
  removeTeam: (id: string) => Promise<void>

  loadPlayers: (teamId: string) => Promise<void>
  createPlayer: (teamId: string, name: string, number: string, gender: Player['gender']) => Promise<Player>
  updatePlayer: (player: Player) => Promise<void>
  removePlayer: (id: string, teamId: string) => Promise<void>

  loadGames: (teamId: string) => Promise<void>
  createGame: (teamId: string, opts: Partial<Game>) => Promise<Game>
  updateGame: (game: Game) => Promise<void>
  removeGame: (id: string, teamId: string) => Promise<void>
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  players: {},
  games: {},
  loading: false,

  async loadTeams() {
    set({ loading: true })
    const teams = await getTeams()
    set({ teams, loading: false })
  },

  async createTeam(name, shortName) {
    const team: Team = {
      id: genId(),
      name,
      shortName,
      createdAt: new Date(),
      ownerId: 'local',
    }
    await upsertTeam(team)
    set(s => ({ teams: [team, ...s.teams] }))
    return team
  },

  async updateTeam(team) {
    await upsertTeam(team)
    set(s => ({ teams: s.teams.map(t => t.id === team.id ? team : t) }))
  },

  async removeTeam(id) {
    await dbDeleteTeam(id)
    set(s => ({
      teams: s.teams.filter(t => t.id !== id),
      players: Object.fromEntries(Object.entries(s.players).filter(([k]) => k !== id)),
      games: Object.fromEntries(Object.entries(s.games).filter(([k]) => k !== id)),
    }))
  },

  async loadPlayers(teamId) {
    const players = await getPlayers(teamId)
    set(s => ({ players: { ...s.players, [teamId]: players } }))
  },

  async createPlayer(teamId, name, number, gender) {
    const player: Player = {
      id: genId(),
      teamId,
      name,
      number,
      gender,
      active: true,
    }
    await upsertPlayer(player)
    set(s => ({ players: { ...s.players, [teamId]: [...(s.players[teamId] ?? []), player] } }))
    return player
  },

  async updatePlayer(player) {
    await upsertPlayer(player)
    set(s => ({
      players: {
        ...s.players,
        [player.teamId]: (s.players[player.teamId] ?? []).map(p => p.id === player.id ? player : p),
      },
    }))
  },

  async removePlayer(id, teamId) {
    await dbDeletePlayer(id)
    set(s => ({
      players: { ...s.players, [teamId]: (s.players[teamId] ?? []).filter(p => p.id !== id) },
    }))
  },

  async loadGames(teamId) {
    const games = await getGames(teamId)
    set(s => ({ games: { ...s.games, [teamId]: games } }))
  },

  async createGame(teamId, opts) {
    const game: Game = {
      id: genId(),
      teamId,
      opponent: opts.opponent ?? 'Unknown',
      date: opts.date ?? new Date(),
      location: opts.location,
      windDirection: opts.windDirection ?? null,
      isComplete: false,
      ourScore: 0,
      theirScore: 0,
    }
    await upsertGame(game)
    set(s => ({ games: { ...s.games, [teamId]: [game, ...(s.games[teamId] ?? [])] } }))
    return game
  },

  async updateGame(game) {
    await upsertGame(game)
    set(s => ({
      games: {
        ...s.games,
        [game.teamId]: (s.games[game.teamId] ?? []).map(g => g.id === game.id ? game : g),
      },
    }))
  },

  async removeGame(id, teamId) {
    await dbDeleteGame(id)
    set(s => ({
      games: { ...s.games, [teamId]: (s.games[teamId] ?? []).filter(g => g.id !== id) },
    }))
  },
}))
