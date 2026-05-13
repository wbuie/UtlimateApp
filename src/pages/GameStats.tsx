import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGame, getPoints, getEvents, getPlayers } from '../lib/db'
import { calcPlayerStats, type PlayerStatRow } from '../lib/stats'
import type { Game, Player, Point, GameEvent } from '../types'

type SortKey = keyof Omit<PlayerStatRow, 'playerId'>

export function GameStats() {
  const { gameId } = useParams<{ gameId: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [points, setPoints] = useState<Point[]>([])
  const [events, setEvents] = useState<GameEvent[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('plusMinus')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gameId) return
    ;(async () => {
      const g = await getGame(gameId)
      if (!g) return setLoading(false)
      const [pts, evts, plrs] = await Promise.all([
        getPoints(gameId),
        getEvents(gameId),
        getPlayers(g.teamId),
      ])
      setGame(g); setPoints(pts); setEvents(evts); setPlayers(plrs)
      setLoading(false)
    })()
  }, [gameId])

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-[#64748b] font-[DM_Mono]">Loading…</div>
  if (!game) return <div className="min-h-dvh flex items-center justify-center text-[#94a3b8] font-[Barlow_Condensed]">Game not found</div>

  const stats = players
    .filter(p => p.active)
    .map(p => ({ player: p, ...calcPlayerStats(p.id, points, events) }))
    .filter(s => s.pointsPlayed > 0)
    .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))

  const COLS: { key: SortKey; label: string }[] = [
    { key: 'pointsPlayed', label: 'Pts' },
    { key: 'goals',        label: 'G' },
    { key: 'assists',      label: 'A' },
    { key: 'dBlocks',      label: 'D' },
    { key: 'plusMinus',    label: '+/-' },
    { key: 'throwPct',     label: 'Thr%' },
    { key: 'catchPct',     label: 'Cat%' },
    { key: 'oEff',         label: 'O-Eff' },
    { key: 'dEff',         label: 'D-Eff' },
  ]

  function fmt(key: SortKey, val: number): string {
    if (key === 'throwPct' || key === 'catchPct') return `${(val * 100).toFixed(0)}%`
    if (key === 'oEff' || key === 'dEff' || key === 'conversionRate') return val.toFixed(2)
    if (key === 'plusMinus') return val >= 0 ? `+${val}` : `${val}`
    return `${val}`
  }

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to={`/game/${game.id}`} className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl">‹</Link>
          <div>
            <h1 className="text-xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none">
              vs {game.opponent}
            </h1>
            <p className="text-xs text-[#64748b] font-[DM_Mono]">
              {new Date(game.date).toLocaleDateString()} · {game.ourScore}–{game.theirScore}
            </p>
          </div>
        </div>
      </header>

      {/* Score summary */}
      <div className="flex items-center justify-center gap-8 py-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-[#f1f5f9] font-[Barlow_Condensed]">{game.ourScore}</div>
          <div className="text-xs text-[#94a3b8] font-[DM_Mono] uppercase">Us</div>
        </div>
        <div className="text-[#64748b] font-[Barlow_Condensed] text-2xl">—</div>
        <div className="text-center">
          <div className="text-5xl font-bold text-[#f1f5f9] font-[Barlow_Condensed]">{game.theirScore}</div>
          <div className="text-xs text-[#94a3b8] font-[DM_Mono] uppercase">{game.opponent}</div>
        </div>
      </div>

      {/* Stats table */}
      <div className="px-3 pb-8 overflow-x-auto">
        <p className="text-xs text-[#64748b] font-[DM_Mono] mb-2">Tap column to sort</p>
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
            {stats.map(s => (
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
        {stats.length === 0 && (
          <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm mt-8">
            No stats recorded yet
          </p>
        )}
      </div>
    </div>
  )
}
