import { useGameStore } from '../../store/gameStore'
import type { LineType } from '../../types'
import { useState } from 'react'

// Between points the tracker parks here: confirm O/D and the seven players
// before the next point starts (mirrors the UltiAnalytics line screen).
export function LineGate() {
  const {
    game, points, activePlayers, onFieldPlayerIds, setOnField,
    suggestedLine, halftimeReached, startPoint,
  } = useGameStore()
  const [line, setLine] = useState<LineType>(suggestedLine)

  if (!game) return null

  const isFirstPoint = points.length === 0
  const count = onFieldPlayerIds.length
  const nextNumber = points.reduce((m, p) => Math.max(m, p.pointNumber), 0) + 1
  const roster = activePlayers.filter(p => p.active)

  function toggle(id: string) {
    const on = onFieldPlayerIds.includes(id)
    if (on) setOnField(onFieldPlayerIds.filter(p => p !== id))
    else if (count < 7) setOnField([...onFieldPlayerIds, id])
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-28">
      {halftimeReached && (
        <div className="rounded-xl px-4 py-3 text-center"
          style={{ background: '#1e3a5f', border: '1px solid #3b82f6' }}>
          <span className="text-sm font-black font-[Barlow_Condensed] uppercase tracking-widest text-[#3b82f6]">
            🕐 Halftime — sides flip
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase tracking-wide">
          {isFirstPoint ? 'First point' : `Point ${nextNumber}`}
        </h2>
        <span className={`text-base font-black font-[Barlow_Condensed] tabular-nums
          ${count === 7 ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
          {count}/7
        </span>
      </div>

      {/* O/D choice */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">
          {isFirstPoint ? 'How do we start?' : 'Line type'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['O', 'D'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLine(l)}
              className={`btn-press py-3.5 rounded-xl font-black font-[Barlow_Condensed] uppercase tracking-widest text-base
                transition-all border
                ${line === l
                  ? l === 'O'
                    ? 'bg-[#22c55e] text-black border-[#22c55e]'
                    : 'bg-[#3b82f6] text-white border-[#3b82f6]'
                  : 'bg-[#273549] border-[#334155] text-[#64748b] hover:text-[#94a3b8]'}`}
              style={line === l ? {
                boxShadow: l === 'O'
                  ? '0 0 16px rgba(34,197,94,0.35)'
                  : '0 0 16px rgba(59,130,246,0.35)',
              } : {}}
            >
              {l === 'O' ? 'Offense · Receive' : 'Defense · Pull'}
            </button>
          ))}
        </div>
      </div>

      {/* Roster grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono]">
            {isFirstPoint || count === 0 ? 'Select players' : 'Same line preselected — adjust if needed'}
          </span>
          {count > 0 && (
            <button onClick={() => setOnField([])}
              className="text-[10px] font-[DM_Mono] text-[#64748b] hover:text-[#94a3b8] uppercase tracking-wider">
              Clear
            </button>
          )}
        </div>
        {roster.length === 0 ? (
          <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm py-6">
            No players on the roster — add them from the team page
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {roster.map(p => {
              const on = onFieldPlayerIds.includes(p.id)
              const full = count >= 7 && !on
              return (
                <button
                  key={p.id}
                  disabled={full}
                  onClick={() => toggle(p.id)}
                  className={`btn-press flex flex-col items-center py-3 px-2 rounded-lg border transition-colors disabled:opacity-30
                    ${on
                      ? 'border-[#22c55e] bg-[#166534] text-[#22c55e]'
                      : 'border-[#334155] bg-[#273549] text-[#f1f5f9] hover:border-[#94a3b8]'}`}
                >
                  <span className="text-xs text-[#94a3b8] font-[DM_Mono]">#{p.number}</span>
                  <span className="text-sm font-bold font-[Barlow_Condensed] uppercase leading-tight text-center">
                    {p.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {count > 0 && count < 7 && (
        <p className="text-center text-[#f59e0b] text-xs font-[DM_Mono]">
          ⚠ Starting with {count} player{count !== 1 ? 's' : ''}
        </p>
      )}

      <button
        disabled={count === 0}
        onClick={() => startPoint(line, onFieldPlayerIds)}
        className="btn-press w-full py-4 bg-[#22c55e] text-black font-black font-[Barlow_Condensed]
                   uppercase tracking-widest rounded-xl text-lg disabled:opacity-30
                   hover:bg-[#16a34a] transition-colors"
        style={{ boxShadow: '0 0 16px rgba(34,197,94,0.25)' }}
      >
        {line === 'O' ? 'Start Point — We Receive' : 'Start Point — We Pull'}
      </button>
    </div>
  )
}
