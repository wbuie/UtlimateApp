import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeamStore } from '../store/teamStore'
import { getGames } from '../lib/db'

export function Home() {
  const { teams, loading, loadTeams, createTeam } = useTeamStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [gameCounts, setGameCounts] = useState<Record<string, number>>({})

  useEffect(() => { loadTeams() }, [])

  useEffect(() => {
    if (teams.length === 0) return
    ;(async () => {
      const counts: Record<string, number> = {}
      await Promise.all(teams.map(async t => {
        const games = await getGames(t.id)
        counts[t.id] = games.length
      }))
      setGameCounts(counts)
    })()
  }, [teams])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createTeam(name.trim(), shortName.trim() || name.trim().slice(0, 3).toUpperCase())
    setName('')
    setShortName('')
    setShowForm(false)
  }

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      {/* Header with atmospheric gradient */}
      <header className="relative bg-[#1e293b] border-b border-[#334155] px-4 py-5 flex items-center justify-between overflow-hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        {/* Radial glow accent */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(34,197,94,0.08) 0%, transparent 60%)' }} />
        <div className="relative">
          {/* Two-line brand lockup */}
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase tracking-wide leading-none">
              ULTI
            </h1>
            <span className="text-xs text-[#22c55e] font-[DM_Mono] uppercase tracking-widest leading-none mb-0.5">
              analytics
            </span>
          </div>
          <p className="text-[10px] text-[#64748b] font-[DM_Mono] uppercase tracking-widest mt-0.5">
            ultimate frisbee tracker
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-press relative bg-[#22c55e] text-black text-sm font-bold font-[Barlow_Condensed] uppercase
                     px-4 py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
          style={{ boxShadow: '0 0 12px rgba(34,197,94,0.25)' }}
        >
          + New Team
        </button>
      </header>

      {/* New team form */}
      {showForm && (
        <form onSubmit={handleCreate}
          className="bg-[#1e293b] border-b border-[#334155] px-4 py-4 flex flex-col gap-3"
          style={{ animation: 'slide-down 0.2s ease-out' }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Team name"
            className="bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                       text-[#f1f5f9] font-[Barlow_Condensed] text-base placeholder:text-[#64748b]
                       focus:outline-none focus:border-[#22c55e]"
          />
          <input
            value={shortName}
            onChange={e => setShortName(e.target.value)}
            placeholder="Short name (e.g. PDX) — optional"
            className="bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                       text-[#f1f5f9] font-[Barlow_Condensed] text-base placeholder:text-[#64748b]
                       focus:outline-none focus:border-[#22c55e]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-press flex-1 bg-[#22c55e] text-black font-bold font-[Barlow_Condensed] uppercase
                         py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-press flex-1 border border-[#334155] text-[#94a3b8] font-bold font-[Barlow_Condensed]
                         uppercase py-2 rounded-lg hover:bg-[#273549] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Team list */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-center text-[#64748b] font-[DM_Mono] text-sm mt-8">Loading…</p>
        ) : teams.length === 0 ? (
          <div className="text-center mt-16 flex flex-col items-center gap-3">
            <div className="text-5xl opacity-60">🥏</div>
            <p className="text-[#f1f5f9] font-[Barlow_Condensed] text-xl uppercase font-black tracking-wide">
              No teams yet
            </p>
            <p className="text-[#64748b] font-[DM_Mono] text-xs uppercase tracking-wider">
              Create your first team to get started
            </p>
          </div>
        ) : (
          teams.map(t => {
            const count = gameCounts[t.id] ?? 0
            return (
              <Link
                key={t.id}
                to={`/team/${t.id}`}
                className="btn-press flex items-center justify-between rounded-xl px-4 py-4
                           hover:border-[#94a3b8] transition-colors no-underline"
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <div>
                  <div className="text-lg font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase tracking-wide">
                    {t.name}
                  </div>
                  <div className="text-xs text-[#64748b] font-[DM_Mono] mt-0.5">
                    {count === 0
                      ? 'No games yet'
                      : `${count} game${count !== 1 ? 's' : ''}`}
                    {' · '}
                    <span className="text-[#475569]">
                      Created {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && (
                    <span className="text-[10px] font-[DM_Mono] text-[#22c55e] border border-[#166534] bg-[#166534]/20
                                     px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  )}
                  <span className="text-[#64748b] text-lg font-[Barlow_Condensed]">›</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
