import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_API_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
