import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase, isCloudConfigured } from '../lib/supabase'
import {
  setLiveSyncEnabled, onSyncQueueChange, pushTeam, listRemoteTeams, pullTeam,
  type TeamData,
} from '../lib/remote'
import { buildTeamBackup } from '../lib/backup'
import { db } from '../lib/db'
import type { Team } from '../types'

interface SyncState {
  configured: boolean
  session: Session | null
  authReady: boolean
  pending: number            // queued live-sync changes
  syncError: string | null
  busy: boolean              // a push/pull is running

  init: () => void
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
  pushTeamToCloud: (team: Team) => Promise<void>
  listCloudTeams: () => Promise<Team[]>
  pullTeamFromCloud: (teamId: string) => Promise<Team>
}

let initialized = false

export const useSyncStore = create<SyncState>((set) => ({
  configured: isCloudConfigured,
  session: null,
  authReady: !isCloudConfigured, // nothing to wait for when cloud is off
  pending: 0,
  syncError: null,
  busy: false,

  init() {
    if (initialized || !supabase) return
    initialized = true

    onSyncQueueChange((pending, error) => set({ pending, syncError: error }))

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, authReady: true })
      setLiveSyncEnabled(!!data.session)
    })
    supabase.auth.onAuthStateChange((_evt, session) => {
      set({ session, authReady: true })
      setLiveSyncEnabled(!!session)
    })
  },

  async signInWithEmail(email) {
    if (!supabase) throw new Error('cloud not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  },

  async signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setLiveSyncEnabled(false)
  },

  async pushTeamToCloud(team) {
    set({ busy: true, syncError: null })
    try {
      const backup = await buildTeamBackup(team)
      await pushTeam(backup)
    } catch (err) {
      set({ syncError: err instanceof Error ? err.message : 'push failed' })
      throw err
    } finally {
      set({ busy: false })
    }
  },

  async listCloudTeams() {
    return listRemoteTeams()
  },

  async pullTeamFromCloud(teamId) {
    set({ busy: true, syncError: null })
    try {
      const data: TeamData = await pullTeam(teamId)
      await db.transaction('rw', [db.teams, db.players, db.games, db.points, db.events], async () => {
        await db.teams.put(data.team)
        await db.players.bulkPut(data.players)
        await db.games.bulkPut(data.games)
        await db.points.bulkPut(data.points)
        await db.events.bulkPut(data.events)
      })
      return data.team
    } catch (err) {
      set({ syncError: err instanceof Error ? err.message : 'pull failed' })
      throw err
    } finally {
      set({ busy: false })
    }
  },
}))
