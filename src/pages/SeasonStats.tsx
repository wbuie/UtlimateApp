import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPlayers, getGames, getPoints, getEvents } from '../lib/db'
import { calcPlayerStats, type PlayerStatRow } from '../lib/stats'
import { exportSeasonCsv } from '../lib/csvExport'
import type { Player, Game } from '../types'

type SortKey = keyof Omit<PlayerStatRow, 'playerId'>

interface SeasonRow extends PlayerStatRow {
  player: Player
  gamesPlayed: number
}

export function SeasonStats() {
  const { teamId } = useParams<{ teamId: string }>()
  const [teamName, setTeamName] = useState('')
  const [stats, setStats] = useState<SeasonRow[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('plusMinus')
  const [loading, setLoading] = useState(true)
  const [allGames, setAllGames] = useState<Game[]>([])

  useEffect(() => {
    if (!teamId) return
    ;(async () => {
      const plrs = await getPlayers(teamId)
      const games = await getGames(teamId)
      setAllGames(games)

      const pointsPerGame = await Promise.all(games.map(g => getPoints(g.id)))
      const eventsPerGame = await Promise.all(games.map(g => getEvents(g.id)))
      const pts = pointsPerGame.flat()
      const evts = eventsPerGame.flat()

      const rows: SeasonRow[] = plrs
        .filter(p => p.active)
        .map(p => {
          const gamesPlayed = games.filter((_, i) =>
            calcPlayerStats(p.id, pointsPerGame[i], eventsPerGame[i]).pointsPlayed > 0
          ).length
          return { player: p, gamesPlayed, ...calcPlayerStats(p.id, pts, evts) }
        })
        .filter(r => r.pointsPlayed > 0)

      setStats(rows)
      const { useTeamStore } = await import('../store/teamStore')
      const teamList = useTeamStore.getState().teams
      const team = teamList.find(t => t.id === teamId)
      setTeamName(team?.name ?? 'Team')
      setLoading(false)
    })()
  }, [teamId])

  const sorted = [...stats].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))

  const COLS: { key: SortKey; label: string }[] = [
    { key: 'pointsPlayed', label: 'Pts' },
    { key: 'goals',        label: 'G' },
    { key: 'assists',      label: 'A' },
    { key: 'dBlocks',      label: 'D' },
    { key: 'plusMinus',    label: '+/-' },
    { key: 'throwPct',     label: 'Thr%' },
    { key: 'catchPct',     label: 'Cat%' },
  ]

  function fmt(key: SortKey, val: number): string {
    if (key === 'throwPct' || key === 'catchPct') return `${(val * 100).toFixed(0)}%`
    if (key === 'oEff' || key === 'dEff' || key === 'conversionRate') return val.toFixed(2)
    if (key === 'plusMinus') return val >= 0 ? `+${val}` : `${val}`
    return `${val}`
  }

  function handleExport() {
    exportSeasonCsv(teamName, stats.map(s => ({ player: s.player, stats: s, gamesPlayed: s.gamesPlayed })))
  }

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-[#64748b] font-[DM_Mono]">Loading…</div>

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      <header className="relative bg-[#1e293b] border-b border-[#334155] px-4 py-4 overflow-hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 10% 50%, rgba(34,197,94,0.07) 0%, transparent 55%)' }} />
        <div className="relative flex items-center gap-3">
          <Link to={`/team/${teamId}`} className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl transition-colors">‹</Link>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-[#22c55e] font-[DM_Mono] uppercase tracking-widest leading-none mb-0.5">
              Season Stats
            </p>
            <h1 className="text-2xl font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none truncate">
              {teamName}
            </h1>
            <p className="text-xs text-[#64748b] font-[DM_Mono] mt-0.5">
              {allGames.length} game{allGames.length !== 1 ? 's' : ''} · {stats.length} player{stats.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleExport}
            className="btn-press text-xs font-[DM_Mono] border border-[#334155] text-[#94a3b8]
                       px-3 py-1.5 rounded-lg hover:bg-[#273549] transition-colors"
          >
            ↓ CSV
          </button>
        </div>
      </header>

      <div className="px-3 py-4 overflow-x-auto">
        <p className="text-[10px] text-[#64748b] font-[DM_Mono] mb-3 uppercase tracking-wider">
          Tap column header to sort
        </p>
        <table className="w-full text-xs font-[DM_Mono] border-collapse">
          <thead>
            <tr>
              <th className="text-left pb-2 text-[#64748b] font-normal pr-3 uppercase tracking-wider">Player</th>
              {COLS.map(c => (
                <th key={c.key} onClick={() => setSortKey(c.key)}
                  className={`pb-2 font-normal uppercase tracking-wider text-right pr-3 cursor-pointer select-none
                    ${sortKey === c.key ? 'text-[#22c55e]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
                  {c.label}
                  {sortKey === c.key && <span className="ml-0.5 text-[#22c55e]">▼</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.playerId}
                className={`border-t border-[#334155] transition-colors
                  ${i % 2 === 0 ? '' : 'bg-[#1a2035]/40'}`}>
                <td className="py-2 pr-3">
                  <Link to={`/team/${teamId}/player/${s.playerId}`}
                    className="font-[Barlow_Condensed] font-black uppercase text-[#22c55e] text-sm
                               hover:text-[#4ade80] transition-colors no-underline">
                    {s.player.name}
                  </Link>
                </td>
                {COLS.map(c => (
                  <td key={c.key}
                    className={`py-2 pr-3 text-right tabular-nums
                      ${c.key === sortKey ? 'text-[#f1f5f9] font-bold' : ''}
                      ${c.key === 'plusMinus'
                        ? (s[c.key] as number) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                        : c.key !== sortKey ? 'text-[#94a3b8]' : ''}`}>
                    {fmt(c.key, s[c.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm mt-8">
            No games recorded yet
          </p>
        )}
      </div>
    </div>
  )
}
