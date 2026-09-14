import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);
async function run() {
  const { data, error } = await supabase.from('app_config').select('id').limit(1);
  console.log("app_config:", error ? error.message : "Exists");
  const { data: d2, error: e2 } = await supabase.from('visitor_logs').select('id').limit(1);
  console.log("visitor_logs:", e2 ? e2.message : "Exists");
}
run();
