// Phase 4: live spectator view. Reads public game data anonymously from
// Supabase and refreshes on Realtime changes — share /watch/:gameId with
// anyone while you track.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, isCloudConfigured } from '../lib/supabase'
import { fetchSpectatorSnapshot, type SpectatorSnapshot } from '../lib/remote'

const EVENT_LABELS: Record<string, string> = {
  pickup:     'Picked up',
  pass:       'Pass',
  goal:       '🏆 Goal',
  throwaway:  'Throwaway',
  drop:       'Drop',
  stall:      'Stall',
  D:          'D Block',
  their_drop: 'Their Drop',
  their_stall:'Their Stall',
  callahan:   '⚡ Callahan',
  their_goal: 'Their Goal',
  penalty:    'Penalty',
  timeout:    '⏱ Timeout',
  their_pass: 'Their Pass',
}

const EVENT_COLOR: Record<string, string> = {
  goal: 'text-[#22c55e]', callahan: 'text-[#f59e0b]', D: 'text-[#22c55e]',
  their_drop: 'text-[#22c55e]', their_stall: 'text-[#22c55e]',
  their_goal: 'text-[#ef4444]', throwaway: 'text-[#ef4444]',
  drop: 'text-[#ef4444]', stall: 'text-[#ef4444]',
}

export function Spectator() {
  const { gameId } = useParams<{ gameId: string }>()
  const [snap, setSnap] = useState<SpectatorSnapshot | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'offline'>(
    isCloudConfigured ? 'loading' : 'offline',
  )
  const [live, setLive] = useState(false)
  const refreshQueued = useRef(false)

  const refresh = useCallback(async () => {
    if (!gameId) return
    try {
      const s = await fetchSpectatorSnapshot(gameId)
      if (!s) { setState('missing'); return }
      setSnap(s)
      setState('ready')
    } catch {
      setState(s => (s === 'ready' ? s : 'offline'))
    }
  }, [gameId])

  useEffect(() => {
    if (!isCloudConfigured) return
    // deferred so the effect body stays free of synchronous state updates
    const t = setTimeout(() => { void refresh() }, 0)
    return () => clearTimeout(t)
  }, [refresh])

  // Realtime: any change to this game's rows → throttled snapshot refresh
  useEffect(() => {
    if (!supabase || !gameId) return
    const client = supabase
    const throttledRefresh = () => {
      if (refreshQueued.current) return
      refreshQueued.current = true
      setTimeout(() => { refreshQueued.current = false; void refresh() }, 1000)
    }
    const channel = client
      .channel(`watch-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `game_id=eq.${gameId}` }, throttledRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points', filter: `game_id=eq.${gameId}` }, throttledRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, throttledRefresh)
      .subscribe(status => setLive(status === 'SUBSCRIBED'))
    return () => { void client.removeChannel(channel) }
  }, [gameId, refresh])

  if (state === 'loading') {
    return <Shell><p className="text-[#64748b] font-[DM_Mono] text-sm">Loading…</p></Shell>
  }
  if (state === 'offline') {
    return (
      <Shell icon="📡" title="Live view unavailable">
        <p className="text-[#94a3b8] font-[DM_Mono] text-sm max-w-sm">
          {isCloudConfigured
            ? 'Could not reach the server. Check your connection and reload.'
            : 'Cloud sync is not configured for this deployment.'}
        </p>
      </Shell>
    )
  }
  if (state === 'missing' || !snap) {
    return (
      <Shell icon="🥏" title="Game not found">
        <p className="text-[#94a3b8] font-[DM_Mono] text-sm max-w-sm">
          This game hasn't been synced to the cloud (or its team isn't public).
          Ask the stat-keeper to sign in so live sync is on.
        </p>
      </Shell>
    )
  }

  const { game, teamName, players, points, events } = snap
  const active = events.filter(e => !e.undone)
  const recent = [...active].reverse().slice(0, 30)
  const currentPoint = points.find(p => !p.endedAt)
  const name = (id?: string) => id ? (players.find(p => p.id === id)?.name ?? '?') : ''

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none truncate">
            {teamName} vs {game.opponent}
          </h1>
          <p className="text-[10px] text-[#64748b] font-[DM_Mono] uppercase tracking-wider mt-0.5">
            {new Date(game.date).toLocaleDateString()} · Spectator view
          </p>
        </div>
        {game.isComplete ? (
          <span className="text-[10px] font-[DM_Mono] text-[#94a3b8] border border-[#334155] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Final
          </span>
        ) : (
          <span className={`text-[10px] font-[DM_Mono] px-2 py-0.5 rounded-full uppercase tracking-wider border
            ${live ? 'text-[#22c55e] border-[#166534] bg-[#166534]/20 animate-pulse' : 'text-[#64748b] border-[#334155]'}`}>
            ● {live ? 'Live' : 'Connecting'}
          </span>
        )}
      </header>

      {/* Score */}
      <div className="flex items-stretch bg-[#0c1424] border-b border-[#334155] min-h-[96px]">
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="text-[9px] uppercase tracking-[0.25em] text-[#64748b] font-[DM_Mono] mb-1 truncate max-w-[120px]">{teamName}</div>
          <div className="text-6xl font-black text-[#f1f5f9] font-[Barlow_Condensed] leading-none tabular-nums">{game.ourScore}</div>
        </div>
        <div className="flex flex-col items-center justify-center px-5 border-x border-[#334155]">
          <div className="text-[9px] uppercase tracking-[0.25em] text-[#475569] font-[DM_Mono]">Pt</div>
          <div className="text-2xl font-black text-[#64748b] font-[Barlow_Condensed] leading-none tabular-nums">
            {currentPoint?.pointNumber ?? (points.length || '—')}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="text-[9px] uppercase tracking-[0.25em] text-[#64748b] font-[DM_Mono] mb-1 truncate max-w-[120px]">{game.opponent}</div>
          <div className="text-6xl font-black text-[#f1f5f9] font-[Barlow_Condensed] leading-none tabular-nums">{game.theirScore}</div>
        </div>
      </div>

      {/* Play-by-play */}
      <div className="flex-1 p-3">
        <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">
          Play-by-play {recent.length ? `· last ${recent.length}` : ''}
        </div>
        {recent.length === 0 ? (
          <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm mt-8">
            Waiting for the first event…
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-[#1e293b] last:border-0">
                <span className={`text-sm font-bold font-[Barlow_Condensed] uppercase ${EVENT_COLOR[e.type] ?? 'text-[#f1f5f9]'}`}>
                  {EVENT_LABELS[e.type] ?? e.type}
                </span>
                <span className="text-xs text-[#94a3b8] font-[DM_Mono]">
                  {e.throwerId ? `${name(e.throwerId)} → ` : ''}{name(e.receiverId)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Shell({ icon, title, children }: { icon?: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col items-center justify-center gap-4 px-6 text-center">
      {icon && <p className="text-5xl">{icon}</p>}
      {title && (
        <h1 className="text-2xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase">{title}</h1>
      )}
      {children}
    </div>
  )
}
