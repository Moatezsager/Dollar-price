import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(20).then(console.log);
