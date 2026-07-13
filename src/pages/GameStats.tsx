import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGame, getPoints, getEvents, getPlayers } from '../lib/db'
import { calcPlayerStats, calcTeamEfficiency, calcKeyEvents, type PlayerStatRow, type TeamEfficiency, type KeyEvent } from '../lib/stats'
import { exportGameCsv, exportRawEventsCsv } from '../lib/csvExport'
import { PlayerStatBars } from '../components/stats/PlayerStatBars'
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
  const [tab, setTab] = useState<'chart' | 'players' | 'timeline'>('chart')

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

  const won = game.ourScore > game.theirScore
  const lost = game.ourScore < game.theirScore

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
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-4"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center gap-3">
          <Link to={`/game/${game.id}`} className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl transition-colors">‹</Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none">
              vs {game.opponent}
            </h1>
            <p className="text-xs text-[#64748b] font-[DM_Mono]">
              {new Date(game.date).toLocaleDateString()}{game.location ? ` · ${game.location}` : ''}
            </p>
          </div>
          <button
            onClick={() => exportGameCsv(game, players, points, events)}
            className="btn-press text-xs font-[DM_Mono] border border-[#334155] text-[#94a3b8]
                       px-3 py-1.5 rounded-lg hover:bg-[#273549] transition-colors whitespace-nowrap"
          >
            ↓ Stats
          </button>
          <button
            onClick={() => exportRawEventsCsv(game, players, points, events)}
            className="btn-press text-xs font-[DM_Mono] border border-[#334155] text-[#94a3b8]
                       px-3 py-1.5 rounded-lg hover:bg-[#273549] transition-colors whitespace-nowrap"
          >
            ↓ Events
          </button>
        </div>
      </header>

      {/* Score summary with result atmosphere */}
      <div className="relative flex items-center justify-center gap-8 py-6 border-b border-[#334155] overflow-hidden">
        {/* Atmospheric result wash */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: won
              ? 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.08) 0%, transparent 65%)'
              : lost
              ? 'radial-gradient(ellipse at 70% 50%, rgba(239,68,68,0.08) 0%, transparent 65%)'
              : 'none',
          }} />
        <div className="relative text-center">
          <div className={`text-6xl font-black font-[Barlow_Condensed] tabular-nums
            ${won ? 'text-[#22c55e]' : lost ? 'text-[#ef4444]' : 'text-[#f1f5f9]'}`}>
            {game.ourScore}
          </div>
          <div className="text-[10px] text-[#94a3b8] font-[DM_Mono] uppercase tracking-widest mt-1">Us</div>
        </div>
        <div className="relative flex flex-col items-center gap-1">
          <div className="text-[#334155] font-[Barlow_Condensed] text-2xl">—</div>
          {game.isComplete && (
            <span className={`text-[9px] font-black font-[Barlow_Condensed] uppercase tracking-widest px-2 py-0.5 rounded
              ${won ? 'text-[#22c55e] bg-[#166534]/30' : lost ? 'text-[#ef4444] bg-[#7f1d1d]/30' : 'text-[#94a3b8] bg-[#334155]/30'}`}>
              {won ? 'W' : lost ? 'L' : 'T'}
            </span>
          )}
        </div>
        <div className="relative text-center">
          <div className={`text-6xl font-black font-[Barlow_Condensed] tabular-nums
            ${lost ? 'text-[#22c55e]' : won ? 'text-[#ef4444]' : 'text-[#f1f5f9]'}`}>
            {game.theirScore}
          </div>
          <div className="text-[10px] text-[#94a3b8] font-[DM_Mono] uppercase tracking-widest mt-1 truncate max-w-[80px]">
            {game.opponent}
          </div>
        </div>
      </div>

      {/* Team efficiency row */}
      <EfficiencyRow eff={eff} />

      {/* Tabs */}
      <div className="flex border-b border-[#334155] bg-[#1e293b]">
        {(['chart', 'players', 'timeline'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn-press flex-1 py-2.5 text-xs font-bold font-[Barlow_Condensed] uppercase tracking-wide transition-colors
              ${tab === t ? 'text-[#f1f5f9] border-b-2 border-[#22c55e]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
            {t === 'chart' ? 'Players' : t === 'players' ? 'Table' : 'Timeline'}
          </button>
        ))}
      </div>

      {/* Player comparison chart */}
      {tab === 'chart' && (
        <div className="px-3 py-4 pb-8">
          <PlayerStatBars rows={stats} />
        </div>
      )}

      {/* Player stats table */}
      {tab === 'players' && (
        <div className="px-3 py-4 overflow-x-auto">
          <p className="text-[10px] text-[#64748b] font-[DM_Mono] mb-2 uppercase tracking-wider">
            Tap column to sort · Tap player for detail
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
                    {sortKey === c.key && <span className="ml-0.5">▼</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.playerId}
                  className={`border-t border-[#334155] transition-colors
                    ${sortKey !== 'plusMinus' ? '' : ''}`}>
                  <td className="py-2 pr-3">
                    <Link to={`/team/${game.teamId}/player/${s.playerId}`}
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
    <div className="flex border-b border-[#334155]" style={{ background: '#131f35' }}>
      <div className="flex-1 flex flex-col items-center py-3 border-r border-[#334155]">
        <div className="text-[9px] text-[#64748b] font-[DM_Mono] uppercase tracking-widest mb-1">O-Hold%</div>
        <div className={`text-2xl font-black font-[Barlow_Condensed] leading-none
          ${eff.oHoldPct >= 0.7 ? 'text-[#22c55e]' : eff.oHoldPct >= 0.5 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
          {(eff.oHoldPct * 100).toFixed(0)}%
        </div>
        <div className="text-[10px] text-[#64748b] font-[DM_Mono] mt-0.5">
          {eff.oHolds}/{eff.oPoints} O pts
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center py-3">
        <div className="text-[9px] text-[#64748b] font-[DM_Mono] uppercase tracking-widest mb-1">D-Break%</div>
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
    <div className={`flex items-center gap-3 p-3 rounded-xl border
      ${isCallahan ? 'border-[#f59e0b] bg-[#78350f]/25' :
        isUs ? 'border-[#22c55e]/30 bg-[#166534]/15' :
               'border-[#2d3748] bg-[#1a2035]'}`}
      style={{ boxShadow: isCallahan ? '0 0 12px rgba(245,158,11,0.15)' : isUs ? '0 0 8px rgba(34,197,94,0.08)' : 'none' }}>
      <div className="text-xl w-8 text-center flex-shrink-0">
        {isCallahan ? '⚡' : isUs ? '🏆' : <span className="text-[#475569] text-base font-black font-[Barlow_Condensed]">×</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-black font-[Barlow_Condensed] uppercase
          ${isCallahan ? 'text-[#f59e0b]' : isUs ? 'text-[#22c55e]' : 'text-[#64748b]'}`}>
          {isCallahan ? `Callahan — ${playerName(ke.scorerId)}` :
           isUs ? `Goal — ${playerName(ke.scorerId)}${ke.assistId ? ` from ${playerName(ke.assistId)}` : ''}` :
           `Their goal`}
        </div>
        <div className="text-[10px] text-[#475569] font-[DM_Mono] mt-0.5">Point {ke.pointNumber}</div>
      </div>
      <div className={`text-base font-black font-[Barlow_Condensed] tabular-nums flex-shrink-0
        ${isUs ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
        {ke.ourScoreAfter}–{ke.theirScoreAfter}
      </div>
    </div>
  )
}
