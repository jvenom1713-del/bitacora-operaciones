import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://nswwsamhalacqthmiois.supabase.co';
const supabaseAnonKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_c1qhYlRlY1JUnYBtF1K8cQ_dMySPQE4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
