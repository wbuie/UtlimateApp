import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTeamStore } from '../store/teamStore'
import type { Player } from '../types'

export function Team() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const {
    teams, players, games,
    loadTeams, loadPlayers, loadGames,
    createPlayer, updatePlayer, removePlayer,
    createGame, removeGame, removeTeam,
  } = useTeamStore()

  const [tab, setTab] = useState<'roster' | 'games'>('roster')
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const [showGameForm, setShowGameForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false)

  // Player form state
  const [pName, setPName] = useState('')
  const [pNumber, setPNumber] = useState('')
  const [pGender, setPGender] = useState<Player['gender']>('X')

  // Game form state
  const [gOpponent, setGOpponent] = useState('')
  const [gDate, setGDate] = useState(new Date().toISOString().slice(0, 10))
  const [gLocation, setGLocation] = useState('')
  const [gWind, setGWind] = useState<import('../types').WindDirection | ''>('')

  useEffect(() => {
    loadTeams()
    if (teamId) {
      loadPlayers(teamId)
      loadGames(teamId)
    }
  }, [teamId])

  const team = teams.find(t => t.id === teamId)
  const teamPlayers = players[teamId ?? ''] ?? []
  const teamGames = games[teamId ?? ''] ?? []

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !pName.trim()) return
    if (editingPlayer) {
      await updatePlayer({ ...editingPlayer, name: pName.trim(), number: pNumber.trim(), gender: pGender })
    } else {
      await createPlayer(teamId, pName.trim(), pNumber.trim(), pGender)
    }
    resetPlayerForm()
  }

  function resetPlayerForm() {
    setPName(''); setPNumber(''); setPGender('X')
    setShowPlayerForm(false); setEditingPlayer(null)
  }

  function startEditPlayer(p: Player) {
    setEditingPlayer(p)
    setPName(p.name); setPNumber(p.number); setPGender(p.gender)
    setShowPlayerForm(true)
  }

  async function handleCreateGame(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !gOpponent.trim()) return
    const game = await createGame(teamId, {
      opponent: gOpponent.trim(),
      date: new Date(gDate),
      location: gLocation.trim() || undefined,
      windDirection: gWind || null,
    })
    setGOpponent(''); setGLocation(''); setGWind(''); setShowGameForm(false)
    navigate(`/game/${game.id}`)
  }

  if (!team) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-[#94a3b8] font-[Barlow_Condensed]">
        Team not found
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col">
      {/* Header */}
      <header className="relative bg-[#1e293b] border-b border-[#334155] px-4 py-4 overflow-hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 10% 50%, rgba(34,197,94,0.06) 0%, transparent 55%)' }} />
        <div className="relative flex items-center gap-3 mb-3">
          <Link to="/" className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl transition-colors">‹</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none truncate">
              {team.name}
            </h1>
          </div>
          {/* Season Stats — distinct from Delete */}
          <Link to={`/team/${team.id}/season`}
            className="btn-press text-xs font-[DM_Mono] text-[#22c55e] border border-[#166534]
                       bg-[#166534]/20 px-3 py-1.5 rounded-lg hover:bg-[#166534]/40
                       no-underline transition-colors whitespace-nowrap">
            Season Stats
          </Link>
          <button
            onClick={() => setConfirmDeleteTeam(true)}
            className="btn-press text-[#ef4444] text-xs font-[DM_Mono] border border-[#7f1d1d]
                       bg-[#7f1d1d]/20 px-3 py-1.5 rounded-lg hover:bg-[#7f1d1d]/40 transition-colors"
          >
            Delete
          </button>
        </div>
        <div className="relative flex gap-1">
          {(['roster', 'games'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn-press px-4 py-1.5 rounded-lg text-sm font-bold font-[Barlow_Condensed] uppercase transition-colors
                ${tab === t ? 'bg-[#334155] text-[#f1f5f9]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Delete confirmation */}
      {confirmDeleteTeam && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 pb-8 px-4"
          onClick={() => setConfirmDeleteTeam(false)}>
          <div className="w-full max-w-sm bg-[#1e293b] border border-[#334155] rounded-2xl p-5 flex flex-col gap-4"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-base font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase">
                Delete {team.name}?
              </p>
              <p className="text-xs text-[#64748b] font-[DM_Mono] mt-1">
                This will permanently remove the team and all game data.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => { await removeTeam(team.id); navigate('/') }}
                className="btn-press flex-1 bg-[#ef4444] text-white font-bold font-[Barlow_Condensed] uppercase py-2.5 rounded-lg">
                Delete
              </button>
              <button onClick={() => setConfirmDeleteTeam(false)}
                className="btn-press flex-1 border border-[#334155] text-[#94a3b8] font-bold font-[Barlow_Condensed] uppercase py-2.5 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster tab */}
      {tab === 'roster' && (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end px-4 pt-4">
            <button
              onClick={() => { resetPlayerForm(); setShowPlayerForm(v => !v) }}
              className="btn-press bg-[#22c55e] text-black text-sm font-bold font-[Barlow_Condensed] uppercase
                         px-4 py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
              style={{ boxShadow: '0 0 10px rgba(34,197,94,0.2)' }}
            >
              + Add Player
            </button>
          </div>

          {showPlayerForm && (
            <form onSubmit={handleAddPlayer}
              className="mx-4 mt-3 bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col gap-3"
              style={{ animation: 'slide-down 0.2s ease-out', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <input
                autoFocus value={pName} onChange={e => setPName(e.target.value)}
                placeholder="Name"
                className="bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                           text-[#f1f5f9] font-[Barlow_Condensed] text-base placeholder:text-[#64748b]
                           focus:outline-none focus:border-[#22c55e]"
              />
              <div className="flex gap-2">
                <input
                  value={pNumber} onChange={e => setPNumber(e.target.value)}
                  placeholder="#"
                  className="w-20 bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                             text-[#f1f5f9] font-[DM_Mono] text-base placeholder:text-[#64748b]
                             focus:outline-none focus:border-[#22c55e]"
                />
                <div className="flex gap-1">
                  {(['M', 'F', 'X'] as const).map(g => (
                    <button
                      type="button" key={g} onClick={() => setPGender(g)}
                      className={`btn-press px-3 py-2 rounded-lg text-sm font-bold font-[Barlow_Condensed] transition-colors
                        ${pGender === g ? 'bg-[#334155] text-[#f1f5f9]' : 'border border-[#334155] text-[#94a3b8]'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="btn-press flex-1 bg-[#22c55e] text-black font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
                  {editingPlayer ? 'Save' : 'Add'}
                </button>
                <button type="button" onClick={resetPlayerForm}
                  className="btn-press flex-1 border border-[#334155] text-[#94a3b8] font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-2 p-4">
            {teamPlayers.length === 0 ? (
              <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm mt-8">
                No players yet
              </p>
            ) : (
              teamPlayers.map(p => (
                <div key={p.id}
                  className="relative flex items-center justify-between rounded-lg px-4 py-3 overflow-hidden"
                  style={{ background: '#1e293b', border: '1px solid #334155', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  {/* Large jersey number watermark */}
                  <span className="absolute right-16 top-1/2 -translate-y-1/2 font-black font-[Barlow_Condensed]
                                   text-4xl leading-none select-none pointer-events-none"
                    style={{ color: '#334155', opacity: 0.6 }}>
                    {p.number || '—'}
                  </span>
                  <div className="relative flex items-center gap-3">
                    <span className="text-[#f1f5f9] font-[Barlow_Condensed] font-black uppercase text-base">{p.name}</span>
                    <span className="text-[10px] text-[#64748b] font-[DM_Mono] border border-[#334155] px-1.5 py-0.5 rounded">
                      {p.gender}
                    </span>
                  </div>
                  <div className="relative flex gap-2">
                    <button onClick={() => startEditPlayer(p)}
                      className="btn-press text-[#94a3b8] text-xs font-[DM_Mono] hover:text-[#f1f5f9] transition-colors">
                      Edit
                    </button>
                    <button onClick={() => removePlayer(p.id, team.id)}
                      className="btn-press text-[#ef4444] text-xs font-[DM_Mono]">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Games tab */}
      {tab === 'games' && (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end px-4 pt-4">
            <button
              onClick={() => setShowGameForm(v => !v)}
              className="btn-press bg-[#3b82f6] text-white text-sm font-bold font-[Barlow_Condensed] uppercase
                         px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
              style={{ boxShadow: '0 0 10px rgba(59,130,246,0.2)' }}
            >
              + New Game
            </button>
          </div>

          {showGameForm && (
            <form onSubmit={handleCreateGame}
              className="mx-4 mt-3 bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col gap-3"
              style={{ animation: 'slide-down 0.2s ease-out', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <input
                autoFocus value={gOpponent} onChange={e => setGOpponent(e.target.value)}
                placeholder="Opponent name"
                className="bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                           text-[#f1f5f9] font-[Barlow_Condensed] text-base placeholder:text-[#64748b]
                           focus:outline-none focus:border-[#3b82f6]"
              />
              <input
                type="date" value={gDate} onChange={e => setGDate(e.target.value)}
                className="bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                           text-[#f1f5f9] font-[DM_Mono] text-base
                           focus:outline-none focus:border-[#3b82f6]"
              />
              <input
                value={gLocation} onChange={e => setGLocation(e.target.value)}
                placeholder="Location (optional)"
                className="bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                           text-[#f1f5f9] font-[Barlow_Condensed] text-base placeholder:text-[#64748b]
                           focus:outline-none focus:border-[#3b82f6]"
              />
              <div>
                <div className="text-xs text-[#64748b] font-[DM_Mono] uppercase tracking-wider mb-2">
                  Wind direction (optional)
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['N','NE','E','SE','S','SW','W','NW'] as const).map(d => (
                    <button
                      type="button" key={d} onClick={() => setGWind(gWind === d ? '' : d)}
                      className={`btn-press py-1.5 rounded text-xs font-bold font-[DM_Mono] transition-colors
                        ${gWind === d
                          ? 'bg-[#3b82f6] text-white'
                          : 'bg-[#273549] border border-[#334155] text-[#94a3b8] hover:border-[#3b82f6]'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="btn-press flex-1 bg-[#3b82f6] text-white font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
                  Start Game
                </button>
                <button type="button" onClick={() => setShowGameForm(false)}
                  className="btn-press flex-1 border border-[#334155] text-[#94a3b8] font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-2 p-4">
            {teamGames.length === 0 ? (
              <p className="text-center text-[#64748b] font-[Barlow_Condensed] uppercase text-sm mt-8">
                No games yet
              </p>
            ) : (
              teamGames.map(g => {
                const won = g.ourScore > g.theirScore
                const lost = g.ourScore < g.theirScore
                return (
                  <div key={g.id}
                    className="flex items-center justify-between rounded-lg px-4 py-3 border-l-4 transition-colors"
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderLeft: `4px solid ${won ? '#22c55e' : lost ? '#ef4444' : '#334155'}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}>
                    <Link to={`/game/${g.id}`} className="flex-1 no-underline">
                      <div className="text-[#f1f5f9] font-[Barlow_Condensed] font-bold uppercase">
                        vs {g.opponent}
                      </div>
                      <div className="text-xs text-[#64748b] font-[DM_Mono]">
                        {new Date(g.date).toLocaleDateString()}
                        {g.location ? ` · ${g.location}` : ''}
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-base font-black font-[Barlow_Condensed]
                          ${won ? 'text-[#22c55e]' : lost ? 'text-[#ef4444]' : 'text-[#94a3b8]'}`}>
                          {g.ourScore}
                        </span>
                        <span className="text-[#64748b] font-[Barlow_Condensed] mx-1">–</span>
                        <span className={`text-base font-black font-[Barlow_Condensed]
                          ${lost ? 'text-[#22c55e]' : won ? 'text-[#ef4444]' : 'text-[#94a3b8]'}`}>
                          {g.theirScore}
                        </span>
                      </div>
                      <Link to={`/stats/${g.id}`}
                        className="btn-press text-[#94a3b8] text-xs font-[DM_Mono] hover:text-[#f1f5f9] no-underline transition-colors">
                        Stats
                      </Link>
                      <button onClick={() => removeGame(g.id, team.id)}
                        className="btn-press text-[#ef4444] text-xs font-[DM_Mono]">
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
