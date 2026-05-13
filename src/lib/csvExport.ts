import type { Game, Player, Point, GameEvent } from '../types'
import { calcPlayerStats } from './stats'

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function row(cells: (string | number)[]): string {
  return cells.map(c => {
    const s = String(c)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }).join(',')
}

const GAME_HEADERS = [
  'Player', 'Number', 'Gender',
  'Points Played', 'Goals', 'Assists', 'D Blocks', 'Drops', 'Throwaways',
  '+/-', 'Throw %', 'Catch %', 'O Efficiency', 'D Efficiency',
  'Conversion Rate', 'Callahan Goals',
]

export function exportGameCsv(game: Game, players: Player[], points: Point[], events: GameEvent[]) {
  const lines: string[] = [
    `# vs ${game.opponent},${new Date(game.date).toLocaleDateString()}`,
    `# Score,${game.ourScore}-${game.theirScore}`,
    '',
    row(GAME_HEADERS),
  ]

  for (const p of players.filter(pl => pl.active)) {
    const s = calcPlayerStats(p.id, points, events)
    if (s.pointsPlayed === 0) continue
    lines.push(row([
      p.name, p.number, p.gender,
      s.pointsPlayed, s.goals, s.assists, s.dBlocks, s.drops, s.throwaways,
      s.plusMinus >= 0 ? `+${s.plusMinus}` : s.plusMinus,
      `${(s.throwPct * 100).toFixed(1)}%`,
      `${(s.catchPct * 100).toFixed(1)}%`,
      s.oEff.toFixed(3),
      s.dEff.toFixed(3),
      s.conversionRate.toFixed(3),
      s.callahanGoals,
    ]))
  }

  const slug = game.opponent.replace(/\s+/g, '-').toLowerCase()
  const date = new Date(game.date).toISOString().slice(0, 10)
  download(`ultianalytics-${date}-vs-${slug}.csv`, lines.join('\n'))
}

const SEASON_HEADERS = [
  'Player', 'Number', 'Gender', 'Games',
  'Points Played', 'Goals', 'Assists', 'D Blocks', 'Drops', 'Throwaways',
  '+/-', 'Throw %', 'Catch %', 'O Efficiency', 'D Efficiency',
  'Conversion Rate', 'Callahan Goals',
]

interface SeasonEntry {
  player: Player
  stats: ReturnType<typeof calcPlayerStats>
  gamesPlayed: number
}

export function exportSeasonCsv(teamName: string, entries: SeasonEntry[]) {
  const lines: string[] = [
    `# ${teamName} Season Stats`,
    '',
    row(SEASON_HEADERS),
  ]

  for (const { player: p, stats: s, gamesPlayed } of entries) {
    lines.push(row([
      p.name, p.number, p.gender, gamesPlayed,
      s.pointsPlayed, s.goals, s.assists, s.dBlocks, s.drops, s.throwaways,
      s.plusMinus >= 0 ? `+${s.plusMinus}` : s.plusMinus,
      `${(s.throwPct * 100).toFixed(1)}%`,
      `${(s.catchPct * 100).toFixed(1)}%`,
      s.oEff.toFixed(3),
      s.dEff.toFixed(3),
      s.conversionRate.toFixed(3),
      s.callahanGoals,
    ]))
  }

  download(`ultianalytics-season-${teamName.replace(/\s+/g, '-').toLowerCase()}.csv`, lines.join('\n'))
}
