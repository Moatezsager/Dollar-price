const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const cleanupOldData = async () => {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return;
  
  try {
    console.log("Running scheduled database cleanup...");`;

const replacementStr = `async function downsampleTable(tableName) {
  try {
    if (!supabase) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString();

    const { data, error } = await supabase
      .from(tableName)
      .select('id, recorded_at, usd')
      .lt('recorded_at', cutoff)
      .order('recorded_at', { ascending: true })
      .limit(10000);

    if (error || !data || data.length === 0) return;

    const groupedByDay = {};
    for (const row of data) {
      if (!row.recorded_at) continue;
      const day = row.recorded_at.split('T')[0];
      if (!groupedByDay[day]) groupedByDay[day] = [];
      groupedByDay[day].push(row);
    }

    let idsToDelete = [];
    for (const day in groupedByDay) {
      const records = groupedByDay[day];
      if (records.length <= 3) continue;

      let highId = records[0].id;
      let lowId = records[0].id;
      let highUsd = records[0].usd || 0;
      let lowUsd = records[0].usd || 999999;
      const closeId = records[records.length - 1].id;

      for (const row of records) {
        const usd = row.usd || 0;
        if (usd > highUsd) { highUsd = usd; highId = row.id; }
        if (usd < lowUsd) { lowUsd = usd; lowId = row.id; }
      }

      const keepIds = new Set([highId, lowId, closeId]);
      for (const row of records) {
        if (!keepIds.has(row.id)) idsToDelete.push(row.id);
      }
    }

    const chunkSize = 200;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      await supabase.from(tableName).delete().in('id', chunk);
    }
    
    if (idsToDelete.length > 0) {
      console.log(\`[Cleanup] Downsampled \${tableName}: deleted \${idsToDelete.length} redundant historical records.\`);
    }
  } catch (err) {
    console.error(\`[Cleanup] Error downsampling \${tableName}:\`, err);
  }
}

const cleanupOldData = async () => {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return;
  
  try {
    console.log("Running scheduled database cleanup...");
    
    // Proposal 4: Downsample data older than 7 days (Keep only High/Low/Close per day)
    await downsampleTable('parallel_rates');
    await downsampleTable('official_rates');`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched cleanupOldData for downsampling.");
} else {
    console.log("Target string not found for cleanup.");
}
