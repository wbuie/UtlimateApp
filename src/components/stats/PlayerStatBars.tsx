import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Cell, LabelList, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { PlayerStatRow } from '../../lib/stats'
import type { Player } from '../../types'

// UltiAnalytics-style player comparison: pick a stat, see every player as a
// ranked horizontal bar. Complements the sortable table (which stays the
// accessible/table view of the same data).

export interface ChartRow extends PlayerStatRow {
  player: Player
}

type StatKey = keyof Omit<PlayerStatRow, 'playerId'>

interface StatDef {
  key: StatKey
  label: string
  pct?: boolean
  diverging?: boolean   // +/- style: negative values allowed
}

const STATS: StatDef[] = [
  { key: 'plusMinus',    label: '+/-', diverging: true },
  { key: 'goals',        label: 'Goals' },
  { key: 'assists',      label: 'Assists' },
  { key: 'dBlocks',      label: 'Ds' },
  { key: 'pointsPlayed', label: 'Points' },
  { key: 'throwPct',     label: 'Throw%', pct: true },
  { key: 'catchPct',     label: 'Catch%', pct: true },
  { key: 'drops',        label: 'Drops' },
  { key: 'throwaways',   label: 'Turns' },
]

// Bar hues validated against the #0f172a surface (lightness band + CVD +
// contrast); sign is double-encoded by bar direction, labels carry the value.
const POS = '#16a34a'
const NEG = '#ef4444'
const BAR_TEXT = '#94a3b8'

export function PlayerStatBars({ rows }: { rows: ChartRow[] }) {
  const [stat, setStat] = useState<StatDef>(STATS[0])

  const data = rows
    .map(r => ({
      name: r.player.name,
      value: stat.pct ? Math.round((r[stat.key] as number) * 100) : (r[stat.key] as number),
    }))
    .sort((a, b) => b.value - a.value)

  if (!data.length) {
    return (
      <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm py-8">
        No stats recorded yet
      </p>
    )
  }

  const fmt = (v: number) => stat.pct ? `${v}%` : stat.diverging && v > 0 ? `+${v}` : `${v}`
  const height = Math.max(120, data.length * 34 + 30)

  return (
    <div className="flex flex-col gap-3">
      {/* Stat picker */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {STATS.map(s => (
          <button
            key={s.key}
            onClick={() => setStat(s)}
            className={`btn-press flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold font-[DM_Mono]
              transition-colors border
              ${stat.key === s.key
                ? 'bg-[#334155] border-[#94a3b8] text-[#f1f5f9]'
                : 'bg-[#1e293b] border-[#334155] text-[#64748b] hover:text-[#94a3b8]'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
          <XAxis type="number" hide domain={stat.diverging ? ['dataMin', 'dataMax'] : [0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="name"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fill: BAR_TEXT, fontSize: 12, fontFamily: 'Barlow Condensed' }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            contentStyle={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              fontFamily: 'DM Mono', fontSize: 12, color: '#f1f5f9',
            }}
            formatter={(v) => [fmt(Number(v)), stat.label]}
          />
          <Bar dataKey="value" barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map(d => (
              <Cell key={d.name} fill={d.value < 0 ? NEG : POS} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v) => fmt(Number(v))}
              style={{ fill: '#f1f5f9', fontSize: 11, fontFamily: 'DM Mono' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
