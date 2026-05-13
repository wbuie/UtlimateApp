import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useTeamStore } from '../store/teamStore'
import { getGame, getEvents, getPoints, getPlayers, upsertPoint } from '../lib/db'
import { ScoreBar } from '../components/tracker/ScoreBar'
import { PossessionBar } from '../components/tracker/PossessionBar'
import { ActionPanel } from '../components/tracker/ActionPanel'
import { LinePanel } from '../components/tracker/LinePanel'
import { EventLog } from '../components/tracker/EventLog'
import { StatsPanel } from '../components/tracker/StatsPanel'
import { BottomBar } from '../components/tracker/BottomBar'
import { ToastContainer } from '../components/shared/Toast'

type Tab = 'actions' | 'line' | 'log' | 'stats'

export function GameTracker() {
  const { gameId } = useParams<{ gameId: string }>()
  const { initGame, game, endPoint } = useGameStore()
  const { loadPlayers } = useTeamStore()
  const [tab, setTab] = useState<Tab>('actions')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gameId) return
    ;(async () => {
      const g = await getGame(gameId)
      if (!g) return setLoading(false)

      await loadPlayers(g.teamId)
      const teamPlayers = await getPlayers(g.teamId)

      const existingPoints = await getPoints(gameId)
      const existingEvents = await getEvents(gameId)

      // Create first point if none exists
      let pts = existingPoints
      if (!pts.length) {
        const firstPoint = {
          id: crypto.randomUUID(),
          gameId,
          pointNumber: 1,
          line: 'D' as const,
          startedAt: new Date(),
          playerIds: [],
          scoredBy: null,
        }
        await upsertPoint(firstPoint)
        pts = [firstPoint]
      }

      initGame(g, teamPlayers, pts, existingEvents)
      setLoading(false)
    })()
  }, [gameId])


  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-[#64748b] font-[DM_Mono]">
        Loading…
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <p className="text-[#94a3b8] font-[Barlow_Condensed] text-lg uppercase">Game not found</p>
        <Link to="/" className="text-[#3b82f6] font-[DM_Mono] text-sm">← Back</Link>
      </div>
    )
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'actions', label: 'Actions' },
    { id: 'line',    label: 'Line' },
    { id: 'log',     label: 'Log' },
    { id: 'stats',   label: 'Stats' },
  ]

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      {/* Back + title */}
      <div className="bg-[#1e293b] border-b border-[#334155] px-4 py-2 flex items-center gap-3">
        <Link to={`/team/${game.teamId}`} className="text-[#94a3b8] hover:text-[#f1f5f9] text-lg">‹</Link>
        <span className="text-sm font-[Barlow_Condensed] uppercase text-[#94a3b8]">
          vs {game.opponent}
        </span>
        <Link to={`/stats/${game.id}`} className="ml-auto text-xs font-[DM_Mono] text-[#94a3b8] hover:text-[#f1f5f9]">
          Stats →
        </Link>
      </div>

      <ScoreBar />
      <PossessionBar />

      {/* Tabs */}
      <div className="flex bg-[#1e293b] border-b border-[#334155]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-bold font-[Barlow_Condensed] uppercase tracking-wide transition-colors
              ${tab === t.id
                ? 'text-[#f1f5f9] border-b-2 border-[#22c55e]'
                : 'text-[#64748b] hover:text-[#94a3b8]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'actions' && <ActionPanel />}
        {tab === 'line'    && <LinePanel />}
        {tab === 'log'     && <EventLog />}
        {tab === 'stats'   && <StatsPanel />}
      </div>

      <BottomBar onEndPoint={endPoint} />
      <ToastContainer />
    </div>
  )
}
