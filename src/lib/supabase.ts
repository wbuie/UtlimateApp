// Phase 4: Supabase client. The whole cloud layer is optional — when the env
// vars are absent the app runs fully offline exactly as before, and every
// sync/spectator feature gates on `supabase` being non-null.
//
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see SUPABASE_SETUP.md).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export const isCloudConfigured = supabase !== null
