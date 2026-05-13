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
      <header className="bg-[#1e293b] border-b border-[#334155] px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link to="/" className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl">‹</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase leading-none">
              {team.name}
            </h1>
          </div>
          <Link to={`/team/${team.id}/season`}
            className="text-xs font-[DM_Mono] text-[#94a3b8] border border-[#334155]
                       px-2 py-1 rounded hover:text-[#f1f5f9] no-underline">
            Season Stats
          </Link>
          <button
            onClick={async () => {
              if (confirm(`Delete ${team.name}?`)) {
                await removeTeam(team.id)
                navigate('/')
              }
            }}
            className="text-[#ef4444] text-xs font-[DM_Mono] border border-[#ef4444] px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
        <div className="flex gap-1">
          {(['roster', 'games'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold font-[Barlow_Condensed] uppercase transition-colors
                ${tab === t ? 'bg-[#334155] text-[#f1f5f9]' : 'text-[#94a3b8] hover:text-[#f1f5f9]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Roster tab */}
      {tab === 'roster' && (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end px-4 pt-4">
            <button
              onClick={() => { resetPlayerForm(); setShowPlayerForm(v => !v) }}
              className="bg-[#22c55e] text-black text-sm font-bold font-[Barlow_Condensed] uppercase
                         px-4 py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
            >
              + Add Player
            </button>
          </div>

          {showPlayerForm && (
            <form onSubmit={handleAddPlayer} className="mx-4 mt-3 bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col gap-3">
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
                      className={`px-3 py-2 rounded-lg text-sm font-bold font-[Barlow_Condensed] transition-colors
                        ${pGender === g ? 'bg-[#334155] text-[#f1f5f9]' : 'border border-[#334155] text-[#94a3b8]'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 bg-[#22c55e] text-black font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
                  {editingPlayer ? 'Save' : 'Add'}
                </button>
                <button type="button" onClick={resetPlayerForm}
                  className="flex-1 border border-[#334155] text-[#94a3b8] font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
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
                  className="flex items-center justify-between bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[#64748b] font-[DM_Mono] text-sm w-8">#{p.number}</span>
                    <span className="text-[#f1f5f9] font-[Barlow_Condensed] font-bold uppercase">{p.name}</span>
                    <span className="text-xs text-[#64748b] font-[DM_Mono]">{p.gender}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditPlayer(p)}
                      className="text-[#94a3b8] text-xs font-[DM_Mono] hover:text-[#f1f5f9]">
                      Edit
                    </button>
                    <button onClick={() => removePlayer(p.id, team.id)}
                      className="text-[#ef4444] text-xs font-[DM_Mono]">
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
              className="bg-[#3b82f6] text-white text-sm font-bold font-[Barlow_Condensed] uppercase
                         px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
            >
              + New Game
            </button>
          </div>

          {showGameForm && (
            <form onSubmit={handleCreateGame} className="mx-4 mt-3 bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col gap-3">
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
              {/* Wind direction */}
              <div>
                <div className="text-xs text-[#64748b] font-[DM_Mono] uppercase tracking-wider mb-2">
                  Wind direction (optional)
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['N','NE','E','SE','S','SW','W','NW'] as const).map(d => (
                    <button
                      type="button" key={d} onClick={() => setGWind(gWind === d ? '' : d)}
                      className={`py-1.5 rounded text-xs font-bold font-[DM_Mono] transition-colors
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
                  className="flex-1 bg-[#3b82f6] text-white font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
                  Start Game
                </button>
                <button type="button" onClick={() => setShowGameForm(false)}
                  className="flex-1 border border-[#334155] text-[#94a3b8] font-bold font-[Barlow_Condensed] uppercase py-2 rounded-lg">
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
              teamGames.map(g => (
                <div key={g.id}
                  className="flex items-center justify-between bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-3">
                  <Link to={`/game/${g.id}`} className="flex-1 no-underline">
                    <div className="text-[#f1f5f9] font-[Barlow_Condensed] font-bold uppercase">
                      vs {g.opponent}
                    </div>
                    <div className="text-xs text-[#64748b] font-[DM_Mono]">
                      {new Date(g.date).toLocaleDateString()}
                      {g.location ? ` · ${g.location}` : ''}
                      {' · '}{g.ourScore}–{g.theirScore}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link to={`/stats/${g.id}`}
                      className="text-[#94a3b8] text-xs font-[DM_Mono] hover:text-[#f1f5f9] no-underline">
                      Stats
                    </Link>
                    <button onClick={() => removeGame(g.id, team.id)}
                      className="text-[#ef4444] text-xs font-[DM_Mono]">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
