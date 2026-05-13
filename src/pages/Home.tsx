import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeamStore } from '../store/teamStore'

export function Home() {
  const { teams, loading, loadTeams, createTeam } = useTeamStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')

  useEffect(() => { loadTeams() }, [])

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
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase tracking-wide leading-none">
            UltiAnalytics
          </h1>
          <p className="text-xs text-[#64748b] font-[DM_Mono]">ultimate frisbee tracker</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-[#22c55e] text-black text-sm font-bold font-[Barlow_Condensed] uppercase
                     px-4 py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
        >
          + New Team
        </button>
      </header>

      {/* New team form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#1e293b] border-b border-[#334155] px-4 py-4 flex flex-col gap-3">
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
              className="flex-1 bg-[#22c55e] text-black font-bold font-[Barlow_Condensed] uppercase
                         py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 border border-[#334155] text-[#94a3b8] font-bold font-[Barlow_Condensed]
                         uppercase py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
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
          <div className="text-center mt-16 flex flex-col gap-3">
            <p className="text-4xl">🥏</p>
            <p className="text-[#f1f5f9] font-[Barlow_Condensed] text-lg uppercase font-bold">
              No teams yet
            </p>
            <p className="text-[#94a3b8] font-[DM_Mono] text-sm">
              Create your first team to get started
            </p>
          </div>
        ) : (
          teams.map(t => (
            <Link
              key={t.id}
              to={`/team/${t.id}`}
              className="flex items-center justify-between bg-[#1e293b] border border-[#334155]
                         rounded-xl px-4 py-4 hover:border-[#94a3b8] transition-colors no-underline"
            >
              <div>
                <div className="text-lg font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase">
                  {t.name}
                </div>
                <div className="text-xs text-[#64748b] font-[DM_Mono]">
                  {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#94a3b8] text-lg">›</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
