import { useState } from 'react'
import { useSyncStore } from '../../store/syncStore'
import { useTeamStore } from '../../store/teamStore'
import type { Team } from '../../types'

// Home-page cloud panel: sign in (magic link), pull teams from the cloud,
// see live-sync status. Renders nothing when the deployment has no Supabase
// config, so the offline-only experience is unchanged.
export function CloudSyncCard() {
  const { configured, session, authReady, pending, syncError, busy,
          signInWithEmail, signOut, listCloudTeams, pullTeamFromCloud } = useSyncStore()
  const { loadTeams, teams } = useTeamStore()

  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [cloudTeams, setCloudTeams] = useState<Team[] | null>(null)
  const [pulled, setPulled] = useState<string | null>(null)

  if (!configured || !authReady) return null

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAuthError(null)
    try {
      await signInWithEmail(email.trim())
      setLinkSent(true)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'sign-in failed')
    }
  }

  async function handleBrowseCloud() {
    try {
      setCloudTeams(await listCloudTeams())
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'could not list teams')
    }
  }

  async function handlePull(teamId: string) {
    const team = await pullTeamFromCloud(teamId)
    await loadTeams()
    setPulled(team.name)
  }

  return (
    <div className="mx-4 mb-2 rounded-xl p-4"
      style={{ background: '#131f35', border: '1px solid #334155' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest font-[DM_Mono] text-[#3b82f6]">
          ☁ Cloud Sync
        </span>
        {session && (
          <span className={`text-[10px] font-[DM_Mono] ${syncError ? 'text-[#ef4444]' : pending ? 'text-[#f59e0b]' : 'text-[#22c55e]'}`}>
            {syncError ? '⚠ retrying' : pending ? `${pending} pending…` : '● up to date'}
          </span>
        )}
      </div>

      {!session ? (
        linkSent ? (
          <p className="text-xs text-[#94a3b8] font-[DM_Mono]">
            Check your email for the sign-in link, then come back here.
          </p>
        ) : (
          <form onSubmit={handleSignIn} className="flex flex-col gap-2">
            <p className="text-xs text-[#64748b] font-[DM_Mono]">
              Sign in to back up teams and share live game links.
            </p>
            <div className="flex gap-2">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 min-w-0 bg-[#273549] border border-[#334155] rounded-lg px-3 py-2
                           text-[#f1f5f9] font-[DM_Mono] text-sm placeholder:text-[#64748b]
                           focus:outline-none focus:border-[#3b82f6]"
              />
              <button type="submit"
                className="btn-press bg-[#3b82f6] text-white text-xs font-bold font-[Barlow_Condensed] uppercase
                           px-4 rounded-lg hover:bg-[#2563eb] transition-colors whitespace-nowrap">
                Send Link
              </button>
            </div>
            {authError && <p className="text-[11px] font-[DM_Mono] text-[#ef4444]">{authError}</p>}
          </form>
        )
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[#94a3b8] font-[DM_Mono] truncate">
            {session.user.email}
            <button onClick={() => signOut()} className="ml-3 text-[#64748b] hover:text-[#94a3b8] underline">
              sign out
            </button>
          </p>
          {syncError && <p className="text-[11px] font-[DM_Mono] text-[#ef4444]">{syncError}</p>}

          {cloudTeams === null ? (
            <button onClick={handleBrowseCloud} disabled={busy}
              className="btn-press self-start text-xs font-[DM_Mono] text-[#94a3b8] border border-[#334155]
                         px-3 py-1.5 rounded-lg hover:bg-[#273549] transition-colors disabled:opacity-40">
              ↓ Pull team from cloud
            </button>
          ) : cloudTeams.length === 0 ? (
            <p className="text-[11px] text-[#64748b] font-[DM_Mono]">
              No teams in the cloud yet — open a team and hit “Push to Cloud”.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {cloudTeams.map(t => {
                const local = teams.some(lt => lt.id === t.id)
                return (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-[Barlow_Condensed] font-bold uppercase text-[#f1f5f9] truncate">
                      {t.name}
                    </span>
                    <button onClick={() => handlePull(t.id)} disabled={busy}
                      className="btn-press text-[11px] font-[DM_Mono] text-[#3b82f6] border border-[#1e3a5f]
                                 px-2.5 py-1 rounded-lg hover:bg-[#1e3a5f]/40 transition-colors disabled:opacity-40 whitespace-nowrap">
                      {local ? '↓ Update local' : '↓ Import'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          {pulled && (
            <p className="text-[11px] font-[DM_Mono] text-[#22c55e]">✓ Pulled “{pulled}” from cloud</p>
          )}
        </div>
      )}
    </div>
  )
}
