import { useGameStore } from '../../store/gameStore'

interface Props {
  onEndPoint: () => void
}

export function BottomBar({ onEndPoint }: Props) {
  const { undoLast, events } = useGameStore()
  const hasEvents = events.some(e => !e.undone)

  return (
    <div className="sticky bottom-0 bg-[#0f172a] border-t border-[#334155] px-3 py-3
                    flex gap-2 pb-[env(safe-area-inset-bottom,12px)]">
      <button
        onClick={undoLast}
        disabled={!hasEvents}
        className="flex-1 py-3 border border-[#334155] rounded-lg text-sm font-bold
                   font-[Barlow_Condensed] uppercase text-[#94a3b8]
                   hover:bg-[#1e293b] transition-colors disabled:opacity-30"
      >
        ↩ Undo
      </button>
      <button
        onClick={onEndPoint}
        className="flex-1 py-3 border border-[#334155] rounded-lg text-sm font-bold
                   font-[Barlow_Condensed] uppercase text-[#f1f5f9]
                   bg-[#1e293b] hover:bg-[#273549] transition-colors"
      >
        End Point →
      </button>
    </div>
  )
}
