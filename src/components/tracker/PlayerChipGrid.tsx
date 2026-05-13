import type { Player } from '../../types'

interface Props {
  players: Player[]
  selectedId?: string | null
  highlightId?: string | null
  onSelect: (id: string) => void
  skipOption?: boolean
  onSkip?: () => void
}

export function PlayerChipGrid({ players, selectedId, highlightId, onSelect, skipOption, onSkip }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex flex-col items-center py-3 px-2 rounded-lg border transition-colors
              ${selectedId === p.id
                ? 'border-[#22c55e] bg-[#166534] text-[#22c55e]'
                : highlightId === p.id
                  ? 'border-[#3b82f6] bg-[#1e3a5f] text-[#3b82f6]'
                  : 'border-[#334155] bg-[#273549] text-[#f1f5f9] hover:border-[#94a3b8]'}`}
          >
            <span className="text-xs text-[#94a3b8] font-[DM_Mono]">#{p.number}</span>
            <span className="text-sm font-bold font-[Barlow_Condensed] uppercase leading-tight text-center">
              {p.name}
            </span>
          </button>
        ))}
      </div>
      {skipOption && (
        <button
          onClick={onSkip}
          className="w-full py-2 text-[#94a3b8] text-sm font-[Barlow_Condensed] uppercase
                     border border-[#334155] rounded-lg hover:bg-[#273549] transition-colors"
        >
          Skip / Unknown
        </button>
      )}
    </div>
  )
}
