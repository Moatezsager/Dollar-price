import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);
async function run() {
  const { data: d1, error: e1 } = await supabase.from('parallel_rates').select('id').limit(1);
  console.log("parallel_rates:", e1 ? e1.message : "Exists");
}
run();
