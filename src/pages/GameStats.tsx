import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGame, getPoints, getEvents, getPlayers } from '../lib/db'
import { calcPlayerStats, calcTeamEfficiency, calcKeyEvents, type PlayerStatRow, type TeamEfficiency, type KeyEvent } from '../lib/stats'
import { exportGameCsv } from '../lib/csvExport'
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
  const [tab, setTab] = useState<'players' | 'timeline'>('players')

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

  const eff = calcTeamEfficiency(points, events)
  const keyEvents = calcKeyEvents(points, events)

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

  function playerName(id?: string) {
    return id ? (players.find(p => p.id === id)?.name ?? '?') : ''
  }

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to={`/game/${game.id}`} className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl">‹</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none">
              vs {game.opponent}
            </h1>
            <p className="text-xs text-[#64748b] font-[DM_Mono]">
              {new Date(game.date).toLocaleDateString()}{game.location ? ` · ${game.location}` : ''}
            </p>
          </div>
          <button
            onClick={() => exportGameCsv(game, players, points, events)}
            className="text-xs font-[DM_Mono] border border-[#334155] text-[#94a3b8]
                       px-3 py-1.5 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            ↓ CSV
          </button>
        </div>
      </header>

      {/* Score summary */}
      <div className="flex items-center justify-center gap-8 py-5 border-b border-[#334155]">
        <div className="text-center">
          <div className="text-5xl font-black text-[#f1f5f9] font-[Barlow_Condensed]">{game.ourScore}</div>
          <div className="text-xs text-[#94a3b8] font-[DM_Mono] uppercase">Us</div>
        </div>
        <div className="text-[#64748b] font-[Barlow_Condensed] text-2xl">—</div>
        <div className="text-center">
          <div className="text-5xl font-black text-[#f1f5f9] font-[Barlow_Condensed]">{game.theirScore}</div>
          <div className="text-xs text-[#94a3b8] font-[DM_Mono] uppercase">{game.opponent}</div>
        </div>
      </div>

      {/* Team efficiency row */}
      <EfficiencyRow eff={eff} />

      {/* Tabs */}
      <div className="flex border-b border-[#334155] bg-[#1e293b]">
        {(['players', 'timeline'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-bold font-[Barlow_Condensed] uppercase tracking-wide transition-colors
              ${tab === t ? 'text-[#f1f5f9] border-b-2 border-[#22c55e]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
            {t === 'players' ? 'Player Stats' : 'Timeline'}
          </button>
        ))}
      </div>

      {/* Player stats table */}
      {tab === 'players' && (
        <div className="px-3 py-4 overflow-x-auto">
          <p className="text-xs text-[#64748b] font-[DM_Mono] mb-2">Tap column to sort · Tap player for detail</p>
          <table className="w-full text-xs font-[DM_Mono] border-collapse">
            <thead>
              <tr>
                <th className="text-left pb-2 text-[#64748b] font-normal pr-3 uppercase tracking-wider">Player</th>
                {COLS.map(c => (
                  <th key={c.key} onClick={() => setSortKey(c.key)}
                    className={`pb-2 font-normal uppercase tracking-wider text-right pr-3 cursor-pointer
                      ${sortKey === c.key ? 'text-[#22c55e]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.playerId} className="border-t border-[#334155]">
                  <td className="py-2 pr-3">
                    <Link to={`/team/${game.teamId}/player/${s.playerId}`}
                      className="font-[Barlow_Condensed] font-bold uppercase text-[#f1f5f9] text-sm
                                 hover:text-[#22c55e] transition-colors no-underline">
                      {s.player.name}
                    </Link>
                  </td>
                  {COLS.map(c => (
                    <td key={c.key}
                      className={`py-2 pr-3 text-right
                        ${c.key === 'plusMinus'
                          ? (s[c.key] as number) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                          : 'text-[#f1f5f9]'}`}>
                      {fmt(c.key, s[c.key] as number)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {stats.length === 0 && (
            <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm mt-8">No stats recorded yet</p>
          )}
        </div>
      )}

      {/* Timeline */}
      {tab === 'timeline' && (
        <div className="px-4 py-4 flex flex-col gap-2 pb-8">
          {keyEvents.length === 0 ? (
            <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm py-8">No scoring events yet</p>
          ) : (
            keyEvents.map((ke, i) => (
              <TimelineRow key={i} ke={ke} playerName={playerName} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Team efficiency bar ────────────────────────────────────────────────────
function EfficiencyRow({ eff }: { eff: TeamEfficiency }) {
  return (
    <div className="flex border-b border-[#334155]">
      <div className="flex-1 flex flex-col items-center py-3 border-r border-[#334155]">
        <div className="text-xs text-[#64748b] font-[DM_Mono] uppercase tracking-wider mb-1">O-Hold%</div>
        <div className={`text-2xl font-black font-[Barlow_Condensed] leading-none
          ${eff.oHoldPct >= 0.7 ? 'text-[#22c55e]' : eff.oHoldPct >= 0.5 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
          {(eff.oHoldPct * 100).toFixed(0)}%
        </div>
        <div className="text-[10px] text-[#64748b] font-[DM_Mono] mt-0.5">
          {eff.oHolds}/{eff.oPoints} O pts
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center py-3">
        <div className="text-xs text-[#64748b] font-[DM_Mono] uppercase tracking-wider mb-1">D-Break%</div>
        <div className={`text-2xl font-black font-[Barlow_Condensed] leading-none
          ${eff.dBreakPct >= 0.4 ? 'text-[#22c55e]' : eff.dBreakPct >= 0.2 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
          {(eff.dBreakPct * 100).toFixed(0)}%
        </div>
        <div className="text-[10px] text-[#64748b] font-[DM_Mono] mt-0.5">
          {eff.dBreaks}/{eff.dPoints} D pts
        </div>
      </div>
    </div>
  )
}

// ── Timeline row ───────────────────────────────────────────────────────────
function TimelineRow({ ke, playerName }: { ke: KeyEvent; playerName: (id?: string) => string }) {
  const isUs = ke.type === 'goal' || ke.type === 'callahan'
  const isCallahan = ke.type === 'callahan'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border
      ${isCallahan ? 'border-[#f59e0b] bg-[#78350f]/30' :
        isUs ? 'border-[#22c55e]/40 bg-[#166534]/20' :
               'border-[#334155] bg-[#1e293b]'}`}>
      <div className="text-lg w-7 text-center flex-shrink-0">
        {isCallahan ? '⚡' : isUs ? '🏆' : '•'}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold font-[Barlow_Condensed] uppercase
          ${isCallahan ? 'text-[#f59e0b]' : isUs ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
          {isCallahan ? `Callahan — ${playerName(ke.scorerId)}` :
           isUs ? `Goal — ${playerName(ke.scorerId)}${ke.assistId ? ` (${playerName(ke.assistId)})` : ''}` :
           'Their goal'}
        </div>
        <div className="text-xs text-[#64748b] font-[DM_Mono]">Point {ke.pointNumber}</div>
      </div>
      <div className="text-sm font-black font-[Barlow_Condensed] text-[#f1f5f9] tabular-nums flex-shrink-0">
        {ke.ourScoreAfter}–{ke.theirScoreAfter}
      </div>
    </div>
  )
}
