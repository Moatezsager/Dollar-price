import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey && !supabaseKey.includes('dummy')) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  supabase.from('error_logs').delete().like('message', '%محجوبة%').then((res) => {
    console.log("Deleted old logs:", res);
  });
} else {
  console.log("No supabase connected.");
}
