import { useGameStore } from '../../store/gameStore'

export function LinePanel() {
  const { activePlayers, onFieldPlayerIds, setOnField } = useGameStore()

  function toggle(id: string) {
    const isOn = onFieldPlayerIds.includes(id)
    if (isOn) {
      setOnField(onFieldPlayerIds.filter(p => p !== id))
    } else if (onFieldPlayerIds.length < 7) {
      setOnField([...onFieldPlayerIds, id])
    }
  }

  const count = onFieldPlayerIds.length

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-[#94a3b8] font-[DM_Mono]">
          Select line (7 max)
        </span>
        <span className={`text-sm font-bold font-[Barlow_Condensed] ${count === 7 ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
          {count}/7
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {activePlayers.filter(p => p.active).map(p => {
          const on = onFieldPlayerIds.includes(p.id)
          const full = count >= 7 && !on
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={full}
              className={`flex flex-col items-center py-3 px-2 rounded-lg border transition-colors
                disabled:opacity-30
                ${on
                  ? 'border-[#22c55e] bg-[#166534] text-[#22c55e]'
                  : 'border-[#334155] bg-[#273549] text-[#f1f5f9] hover:border-[#94a3b8]'}`}
            >
              <span className="text-xs text-[#94a3b8] font-[DM_Mono]">#{p.number}</span>
              <span className="text-sm font-bold font-[Barlow_Condensed] uppercase leading-tight text-center">
                {p.name}
              </span>
              {on && <span className="text-[10px] text-[#22c55e] font-[DM_Mono] mt-0.5">ON</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
