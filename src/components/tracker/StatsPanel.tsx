import { useGameStore } from '../../store/gameStore'
import { calcPlayerStats } from '../../lib/stats'

const COLS = ['Player', 'G', 'A', 'D', '+/-', 'Throw%', 'Catch%'] as const

export function StatsPanel() {
  const { activePlayers, onFieldPlayerIds, points, events } = useGameStore()
  const players = activePlayers.filter(p => onFieldPlayerIds.includes(p.id))

  if (!players.length) {
    return (
      <div className="p-6 text-center text-[#64748b] text-sm font-[Barlow_Condensed] uppercase">
        Set your line to see live stats
      </div>
    )
  }

  return (
    <div className="p-3 overflow-x-auto">
      <table className="w-full text-xs font-[DM_Mono]">
        <thead>
          <tr>
            {COLS.map(c => (
              <th key={c} className="text-left pb-2 text-[#64748b] font-normal uppercase tracking-wider pr-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map(p => {
            const s = calcPlayerStats(p.id, points, events)
            return (
              <tr key={p.id} className="border-t border-[#334155]">
                <td className="py-2 pr-3 text-[#f1f5f9] font-[Barlow_Condensed] font-bold uppercase text-sm">
                  {p.name}
                </td>
                <td className="py-2 pr-3 text-[#22c55e]">{s.goals}</td>
                <td className="py-2 pr-3 text-[#22c55e]">{s.assists}</td>
                <td className="py-2 pr-3 text-[#3b82f6]">{s.dBlocks}</td>
                <td className={`py-2 pr-3 font-bold ${s.plusMinus >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {s.plusMinus >= 0 ? '+' : ''}{s.plusMinus}
                </td>
                <td className="py-2 pr-3 text-[#f1f5f9]">
                  {(s.throwPct * 100).toFixed(0)}%
                </td>
                <td className="py-2 pr-3 text-[#f1f5f9]">
                  {(s.catchPct * 100).toFixed(0)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
