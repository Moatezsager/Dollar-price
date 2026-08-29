import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

put_route = r'''    app.put\("/api/admin/records/:market/:id", requireAdmin, async \(req: express\.Request, res: express\.Response\) => \{
      const \{ market, id \} = req\.params;
      const \{ currency, value \} = req\.body;
      const table = market === 'official' \? 'official_rates' : 'parallel_rates';
      
      if \(!supabase \|\| !supabaseAnonKey \|\| supabaseAnonKey\.includes\('dummy'\)\) \{
        return res\.status\(500\)\.json\(\{ success: false, message: "قاعدة البيانات غير متصلة" \}\);
      \}
      
      try \{
        const \{ data: existing, error: fetchError \} = await supabase
          \.from\(table\)
          \.select\('rates'\)
          \.eq\('id', id\)
          \.single\(\);
          
        if \(fetchError\) throw fetchError;
        
        const updatedRates = \{ \.\.\.existing\.rates, \[currency\]: parseFloat\(value\) \};
        
        const \{ error: updateError \} = await supabase
          \.from\(table\)
          \.update\(\{ rates: updatedRates \}\)
          \.eq\('id', id\);
          
        if \(updateError\) throw updateError;
        
        // Invalidate caches
        cachedHistory = null;
        lastHistoryFetchTime = 0;
        
        res\.json\(\{ success: true \}\);
      \} catch \(err: any\) \{'''

put_replacement = r'''    app.put("/api/admin/records/:market/:id", requireAdmin, async (req: express.Request, res: express.Response) => {
      const { market, id } = req.params;
      const { currency, value } = req.body;
      const table = market === 'official' ? 'official_rates' : 'parallel_rates';
      
      if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
        return res.status(500).json({ success: false, message: "قاعدة البيانات غير متصلة" });
      }
      
      try {
        const { data: existing, error: fetchError } = await supabase
          .from(table)
          .select('rates')
          .eq('id', id)
          .single();
          
        if (fetchError) throw fetchError;
        
        const updatedRates = { ...existing.rates, [currency]: parseFloat(value) };
        if (currency === 'USD' && table === 'parallel_rates') {
           // Also update the dedicated 'usd' column if needed
           const { error: updateError } = await supabase
             .from(table)
             .update({ rates: updatedRates, usd: parseFloat(value) })
             .eq('id', id);
           if (updateError) throw updateError;
        } else if (currency === 'USD' && table === 'official_rates') {
           const { error: updateError } = await supabase
             .from(table)
             .update({ rates: updatedRates, usd: parseFloat(value) })
             .eq('id', id);
           if (updateError) throw updateError;
        } else {
           const { error: updateError } = await supabase
             .from(table)
             .update({ rates: updatedRates })
             .eq('id', id);
           if (updateError) throw updateError;
        }
          
        // Invalidate caches & update memory state
        cachedHistory = null;
        lastHistoryFetchTime = 0;
        await loadLatestRatesFromSupabase();
        broadcastRatesUpdate(rates);
        
        res.json({ success: true });
      } catch (err: any) {'''

del_route = r'''    app.delete\("/api/admin/records/:market/:id", requireAdmin, async \(req: express\.Request, res: express\.Response\) => \{
      const \{ market, id \} = req\.params;
      const table = market === 'official' \? 'official_rates' : 'parallel_rates';
      
      if \(!supabase \|\| !supabaseAnonKey \|\| supabaseAnonKey\.includes\('dummy'\)\) \{
        return res\.status\(500\)\.json\(\{ success: false, message: "قاعدة البيانات غير متصلة" \}\);
      \}
      
      try \{
        const \{ error \} = await supabase
          \.from\(table\)
          \.delete\(\)
          \.eq\('id', id\);
          
        if \(error\) throw error;
        
        // Invalidate caches
        cachedHistory = null;
        lastHistoryFetchTime = 0;
        
        res\.json\(\{ success: true \}\);
      \} catch \(err: any\) \{'''

del_replacement = r'''    app.delete("/api/admin/records/:market/:id", requireAdmin, async (req: express.Request, res: express.Response) => {
      const { market, id } = req.params;
      const table = market === 'official' ? 'official_rates' : 'parallel_rates';
      
      if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
        return res.status(500).json({ success: false, message: "قاعدة البيانات غير متصلة" });
      }
      
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Invalidate caches & update memory state
        cachedHistory = null;
        lastHistoryFetchTime = 0;
        await loadLatestRatesFromSupabase();
        broadcastRatesUpdate(rates);
        
        res.json({ success: true });
      } catch (err: any) {'''

# Replace spaces logic with careful re.sub
new_content = re.sub(re.sub(r'\s+', r'\\s+', put_route), put_replacement, content, flags=re.MULTILINE)
new_content = re.sub(re.sub(r'\s+', r'\\s+', del_route), del_replacement, new_content, flags=re.MULTILINE)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("done")
