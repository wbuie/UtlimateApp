import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSyncStore } from '../store/syncStore'
import { getGame, getEvents, getPoints, getPlayers } from '../lib/db'
import { ScoreBar } from '../components/tracker/ScoreBar'
import { PossessionBar } from '../components/tracker/PossessionBar'
import { ActionPanel } from '../components/tracker/ActionPanel'
import { LineGate } from '../components/tracker/LineGate'
import { LinePanel } from '../components/tracker/LinePanel'
import { EventLog } from '../components/tracker/EventLog'
import { StatsPanel } from '../components/tracker/StatsPanel'
import { BottomBar } from '../components/tracker/BottomBar'
import { ToastContainer } from '../components/shared/Toast'

type Tab = 'actions' | 'line' | 'log' | 'stats'

export function GameTracker() {
  const { gameId } = useParams<{ gameId: string }>()
  const { initGame, game, currentPoint, addToast } = useGameStore()
  const { session } = useSyncStore()
  const [tab, setTab] = useState<Tab>('actions')
  const [loading, setLoading] = useState(true)

  async function shareLiveLink() {
    if (!game) return
    const url = `${window.location.origin}/watch/${game.id}`
    try {
      if (navigator.share) await navigator.share({ title: `Live: vs ${game.opponent}`, url })
      else {
        await navigator.clipboard.writeText(url)
        addToast('Live link copied')
      }
    } catch {
      addToast(url) // last resort: surface it
    }
  }

  useEffect(() => {
    if (!gameId) return
    let cancelled = false
    ;(async () => {
      const g = await getGame(gameId)
      if (cancelled) return
      if (!g) return setLoading(false)

      const [teamPlayers, existingPoints, existingEvents] = await Promise.all([
        getPlayers(g.teamId),
        getPoints(gameId),
        getEvents(gameId),
      ])
      if (cancelled) return

      initGame(g, teamPlayers, existingPoints, existingEvents)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [gameId, initGame])

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

  // Between points (and game still live) → the line gate owns the screen
  const showLineGate = !currentPoint && !game.isComplete

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
        <Link to={`/team/${game.teamId}`} aria-label="Back to team"
          className="text-[#94a3b8] hover:text-[#f1f5f9] text-lg">‹</Link>
        <span className="text-sm font-[Barlow_Condensed] uppercase text-[#94a3b8]">
          vs {game.opponent}
          {game.targetScore ? <span className="text-[#475569]"> · to {game.targetScore}</span> : null}
        </span>
        {session && (
          <button onClick={shareLiveLink} aria-label="Share live spectator link"
            className="ml-auto text-xs font-[DM_Mono] text-[#3b82f6] hover:text-[#60a5fa]">
            📡 Share
          </button>
        )}
        <Link to={`/stats/${game.id}`}
          className={`text-xs font-[DM_Mono] text-[#94a3b8] hover:text-[#f1f5f9] ${session ? '' : 'ml-auto'}`}>
          Stats →
        </Link>
      </div>

      <ScoreBar />

      {showLineGate ? (
        <div className="flex-1 overflow-y-auto">
          <LineGate />
        </div>
      ) : (
        <>
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
            {tab === 'actions' && (game.isComplete ? <GameCompletePanel gameId={game.id} /> : <ActionPanel />)}
            {tab === 'line'    && <LinePanel />}
            {tab === 'log'     && <EventLog />}
            {tab === 'stats'   && <StatsPanel />}
          </div>
        </>
      )}

      <BottomBar />
      <ToastContainer />
    </div>
  )
}

function GameCompletePanel({ gameId }: { gameId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="text-4xl">🏁</div>
      <p className="text-[#f1f5f9] font-[Barlow_Condensed] text-lg uppercase font-black tracking-wide">
        Game complete
      </p>
      <p className="text-[#64748b] font-[DM_Mono] text-xs">
        The tracker is read-only. Check the log and stats tabs, or open the full summary.
      </p>
      <Link to={`/stats/${gameId}`}
        className="btn-press bg-[#22c55e] text-black font-black font-[Barlow_Condensed] uppercase
                   tracking-widest px-6 py-3 rounded-lg no-underline">
        View Final Stats →
      </Link>
    </div>
  )
}
