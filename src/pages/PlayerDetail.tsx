import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPlayers, getGames, getPoints, getEvents } from '../lib/db'
import { calcPlayerStats, type PlayerStatRow } from '../lib/stats'
import type { Player, Game, Point, GameEvent } from '../types'

interface GameRow extends PlayerStatRow {
  game: Game
}

export function PlayerDetail() {
  const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [career, setCareer] = useState<PlayerStatRow | null>(null)
  const [gameRows, setGameRows] = useState<GameRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId || !playerId) return
    ;(async () => {
      const players = await getPlayers(teamId)
      const p = players.find(pl => pl.id === playerId)
      if (!p) return setLoading(false)
      setPlayer(p)

      const games = await getGames(teamId)
      const rows: GameRow[] = []
      const allPoints: Point[] = []
      const allEvents: GameEvent[] = []

      for (const g of games) {
        const [pts, evts] = await Promise.all([getPoints(g.id), getEvents(g.id)])
        allPoints.push(...pts)
        allEvents.push(...evts)
        const stats = calcPlayerStats(playerId, pts, evts)
        if (stats.pointsPlayed > 0) rows.push({ ...stats, game: g })
      }

      rows.sort((a, b) => new Date(b.game.date).getTime() - new Date(a.game.date).getTime())
      setGameRows(rows)
      setCareer(calcPlayerStats(playerId, allPoints, allEvents))
      setLoading(false)
    })()
  }, [teamId, playerId])

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-[#64748b] font-[DM_Mono]">Loading…</div>
  if (!player || !career) return <div className="min-h-dvh flex items-center justify-center text-[#94a3b8] font-[Barlow_Condensed]">Player not found</div>

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to={`/team/${teamId}/season`} className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl">‹</Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-[#64748b] font-[DM_Mono] text-sm">#{player.number}</span>
              <h1 className="text-xl font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none">
                {player.name}
              </h1>
              <span className="text-xs text-[#64748b] font-[DM_Mono] border border-[#334155] px-1.5 py-0.5 rounded">
                {player.gender}
              </span>
            </div>
            <p className="text-xs text-[#64748b] font-[DM_Mono] mt-0.5">
              {gameRows.length} game{gameRows.length !== 1 ? 's' : ''} · {career.pointsPlayed} points played
            </p>
          </div>
        </div>
      </header>

      {/* Career stat cards */}
      <div className="px-4 py-4">
        <div className="text-xs uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-3">Career totals</div>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <StatCard label="Goals" value={career.goals} color="green" />
          <StatCard label="Assists" value={career.assists} color="green" />
          <StatCard label="D Blocks" value={career.dBlocks} color="blue" />
          <StatCard label="+/-" value={career.plusMinus} color={career.plusMinus >= 0 ? 'green' : 'red'} signed />
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <StatCard label="Throw%" value={career.throwPct} color="default" pct />
          <StatCard label="Catch%" value={career.catchPct} color="default" pct />
          <StatCard label="O-Eff" value={career.oEff} color="default" dec />
          <StatCard label="D-Eff" value={career.dEff} color="default" dec />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Drops" value={career.drops} color="red" />
          <StatCard label="T-aways" value={career.throwaways} color="red" />
          <StatCard label="Callahs" value={career.callahanGoals} color="amber" />
          <StatCard label="Conv%" value={career.conversionRate} color="default" pct />
        </div>
      </div>

      {/* Game-by-game */}
      <div className="px-4 pb-8">
        <div className="text-xs uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-3">Game by game</div>
        {gameRows.length === 0 ? (
          <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm py-8">No games yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {gameRows.map(row => (
              <Link
                key={row.game.id}
                to={`/stats/${row.game.id}`}
                className="bg-[#1e293b] border border-[#334155] rounded-xl p-3 no-underline
                           hover:border-[#94a3b8] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase">
                      vs {row.game.opponent}
                    </span>
                    <span className="text-xs text-[#64748b] font-[DM_Mono] ml-2">
                      {new Date(row.game.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs font-[DM_Mono] text-[#94a3b8]">
                    {row.game.ourScore}–{row.game.theirScore}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 text-center">
                  {[
                    { label: 'G',   val: row.goals },
                    { label: 'A',   val: row.assists },
                    { label: 'D',   val: row.dBlocks },
                    { label: '+/-', val: row.plusMinus, signed: true },
                    { label: 'Thr', val: `${(row.throwPct * 100).toFixed(0)}%` },
                    { label: 'Cat', val: `${(row.catchPct * 100).toFixed(0)}%` },
                  ].map(c => (
                    <div key={c.label} className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[#64748b] font-[DM_Mono] uppercase">{c.label}</span>
                      <span className={`text-sm font-bold font-[DM_Mono]
                        ${c.label === '+/-'
                          ? (row.plusMinus >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')
                          : 'text-[#f1f5f9]'}`}>
                        {c.signed && typeof c.val === 'number' && c.val > 0 ? `+${c.val}` : c.val}
                      </span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stat card sub-component ────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: number
  color: 'green' | 'red' | 'blue' | 'amber' | 'default'
  signed?: boolean
  pct?: boolean
  dec?: boolean
}

function StatCard({ label, value, color, signed, pct, dec }: StatCardProps) {
  const colorMap = {
    green:   'text-[#22c55e]',
    red:     'text-[#ef4444]',
    blue:    'text-[#3b82f6]',
    amber:   'text-[#f59e0b]',
    default: 'text-[#f1f5f9]',
  }

  let display: string
  if (pct) display = `${(value * 100).toFixed(0)}%`
  else if (dec) display = value.toFixed(2)
  else if (signed && value > 0) display = `+${value}`
  else display = `${value}`

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-lg flex flex-col items-center py-3 px-1">
      <span className={`text-xl font-black font-[Barlow_Condensed] leading-none ${colorMap[color]}`}>
        {display}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-[#64748b] font-[DM_Mono] mt-1">
        {label}
      </span>
    </div>
  )
}
