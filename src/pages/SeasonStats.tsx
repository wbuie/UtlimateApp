import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPlayers, getGames, getPoints, getEvents } from '../lib/db'
import { calcPlayerStats, type PlayerStatRow } from '../lib/stats'
import type { Player } from '../types'

type SortKey = keyof Omit<PlayerStatRow, 'playerId'>

export function SeasonStats() {
  const { teamId } = useParams<{ teamId: string }>()
  const [, setPlayers] = useState<Player[]>([])
  const [stats, setStats] = useState<(PlayerStatRow & { player: Player })[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('plusMinus')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId) return
    ;(async () => {
      const plrs = await getPlayers(teamId)
      const games = await getGames(teamId)
      setPlayers(plrs)

      const allPoints = (await Promise.all(games.map(g => getPoints(g.id)))).flat()
      const allEvents = (await Promise.all(games.map(g => getEvents(g.id)))).flat()

      const rows = plrs
        .filter(p => p.active)
        .map(p => ({ player: p, ...calcPlayerStats(p.id, allPoints, allEvents) }))
        .filter(s => s.pointsPlayed > 0)

      setStats(rows)
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

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-[#64748b] font-[DM_Mono]">Loading…</div>

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to={`/team/${teamId}`} className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl">‹</Link>
          <h1 className="text-xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none">
            Season Stats
          </h1>
        </div>
      </header>

      <div className="px-3 py-4 overflow-x-auto">
        <p className="text-xs text-[#64748b] font-[DM_Mono] mb-2">
          {stats.length} players · {stats[0]?.pointsPlayed ?? 0}+ points played · Tap column to sort
        </p>
        <table className="w-full text-xs font-[DM_Mono] border-collapse">
          <thead>
            <tr>
              <th className="text-left pb-2 text-[#64748b] font-normal pr-3 uppercase tracking-wider">Player</th>
              {COLS.map(c => (
                <th key={c.key}
                  onClick={() => setSortKey(c.key)}
                  className={`pb-2 font-normal uppercase tracking-wider text-right pr-3 cursor-pointer
                    ${sortKey === c.key ? 'text-[#22c55e]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.playerId} className="border-t border-[#334155]">
                <td className="py-2 pr-3 font-[Barlow_Condensed] font-bold uppercase text-[#f1f5f9] text-sm">
                  {s.player.name}
                </td>
                {COLS.map(c => (
                  <td key={c.key}
                    className={`py-2 pr-3 text-right
                      ${c.key === 'plusMinus'
                        ? (s[c.key] as number) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                        : 'text-[#f1f5f9]'}`}
                  >
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
