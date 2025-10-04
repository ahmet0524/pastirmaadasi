// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Client-side veya SSR için normal Supabase
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)

// Admin işlemleri (server-side) için service role key kullan
export const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
)
