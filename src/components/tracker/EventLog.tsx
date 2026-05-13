import { useGameStore } from '../../store/gameStore'

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
}

const EVENT_COLOR: Record<string, string> = {
  goal:       'text-[#22c55e]',
  callahan:   'text-[#f59e0b]',
  their_goal: 'text-[#ef4444]',
  throwaway:  'text-[#ef4444]',
  drop:       'text-[#ef4444]',
  stall:      'text-[#ef4444]',
  D:          'text-[#22c55e]',
  their_drop: 'text-[#22c55e]',
  their_stall:'text-[#22c55e]',
}

export function EventLog() {
  const { events, activePlayers } = useGameStore()
  const active = [...events].filter(e => !e.undone).reverse()

  function name(id?: string) {
    if (!id) return ''
    return activePlayers.find(p => p.id === id)?.name ?? '?'
  }

  if (!active.length) {
    return (
      <div className="p-6 text-center text-[#64748b] text-sm font-[Barlow_Condensed] uppercase">
        No events yet
      </div>
    )
  }

  return (
    <div className="p-3 flex flex-col gap-1">
      {active.map(e => (
        <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-[#334155] last:border-0">
          <span className={`text-sm font-bold font-[Barlow_Condensed] uppercase ${EVENT_COLOR[e.type] ?? 'text-[#f1f5f9]'}`}>
            {EVENT_LABELS[e.type] ?? e.type}
          </span>
          <span className="text-xs text-[#94a3b8] font-[DM_Mono]">
            {e.throwerId ? `${name(e.throwerId)} → ` : ''}
            {name(e.receiverId)}
          </span>
        </div>
      ))}
    </div>
  )
}
