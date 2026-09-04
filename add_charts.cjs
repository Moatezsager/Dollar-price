const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Import LineChart from lucide-react if not present, and recharts components if missing.
if (!app.includes('LineChart,')) {
  app = app.replace('Building2,', 'Building2,\n  LineChart,');
}
if (!app.includes('LineChart as RechartsLineChart')) {
  // It's probably easier to just use AreaChart which is already there, it looks better anyway.
}

// 2. Add 'charts' to activeTab state
app = app.replace(
  "useState<'main' | 'gold' | 'converter' | 'more'>('main')",
  "useState<'main' | 'gold' | 'charts' | 'converter' | 'more'>('main')"
);

// 3. Add chart states
const statesToAdd = `
  const [chartAnalysisCurrency, setChartAnalysisCurrency] = useState('USD');
  const [chartAnalysisRange, setChartAnalysisRange] = useState<'1w' | '1m' | '6m' | '1y' | 'all'>('1m');
`;
if (!app.includes('setChartAnalysisCurrency')) {
  app = app.replace(/const \[activeTab, setActiveTab\] = [^\n]+\n/, "$&\n" + statesToAdd);
}

// 4. Add the Charts Section
// Find where the gold section ends, or before currency converter.
// The converter section is <section id="currency-converter-section"
const chartsSection = `
        {/* التحليل والرسوم البيانية */}
        <section id="charts-section" className={\`mt-16 \${activeTab === 'charts' ? '' : 'hidden md:block'}\`}>
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 mb-2">
              <LineChart className="w-8 h-8 text-fuchsia-500" />
              التحليل المتقدم
            </h2>
            <p className="text-zinc-400">تابع اتجاهات السوق وحركة الأسعار زمنياً</p>
          </div>
          
          <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            {/* الخلفية الزخرفية */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* العملة */}
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto">
                  {['USD', 'EUR', 'GBP', 'GOLD'].map(curr => (
                    <button
                      key={curr}
                      onClick={() => setChartAnalysisCurrency(curr)}
                      className={\`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all \${chartAnalysisCurrency === curr ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-zinc-400 hover:text-zinc-200'}\`}
                    >
                      {curr === 'GOLD' ? 'ذهب كسر 18' : curr}
                    </button>
                  ))}
                </div>
                
                {/* النطاق الزمني */}
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full sm:w-auto">
                  {[
                    { id: '1w', label: 'أسبوع' },
                    { id: '1m', label: 'شهر' },
                    { id: '6m', label: '6 أشهر' },
                    { id: '1y', label: 'سنة' },
                    { id: 'all', label: 'الكل' }
                  ].map(range => (
                    <button
                      key={range.id}
                      onClick={() => setChartAnalysisRange(range.id as any)}
                      className={\`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-bold transition-all \${chartAnalysisRange === range.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}\`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* الرسم البياني */}
              <div className="w-full h-[300px] sm:h-[400px]">
                {history.length > 0 ? (() => {
                  // تحضير البيانات
                  const now = new Date();
                  let cutoff = new Date(0);
                  if (chartAnalysisRange === '1w') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  if (chartAnalysisRange === '1m') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  if (chartAnalysisRange === '6m') cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                  if (chartAnalysisRange === '1y') cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                  
                  const filteredData = history
                    .filter(h => new Date(h.time) >= cutoff)
                    .map(h => {
                      let val = 0;
                      if (chartAnalysisCurrency === 'USD') val = h.rates?.parallel?.USD || 0;
                      if (chartAnalysisCurrency === 'EUR') val = h.rates?.parallel?.EUR || 0;
                      if (chartAnalysisCurrency === 'GBP') val = h.rates?.parallel?.GBP || 0;
                      if (chartAnalysisCurrency === 'GOLD') val = h.rates?.gold?.karat18 || 0;
                      
                      return {
                        time: format(new Date(h.time), "yyyy-MM-dd HH:mm"),
                        rawTime: h.time,
                        value: val
                      };
                    })
                    .filter(d => d.value > 0);

                  if (filteredData.length < 2) {
                    return <div className="w-full h-full flex items-center justify-center text-zinc-500">لا توجد بيانات كافية لهذه الفترة</div>;
                  }

                  const firstVal = filteredData[0].value;
                  const lastVal = filteredData[filteredData.length - 1].value;
                  const isUp = lastVal >= firstVal;
                  const color = isUp ? "#10b981" : "#f43f5e";

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAnalysis" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="time" 
                          hide={false} 
                          tick={{ fill: '#71717a', fontSize: 10 }}
                          tickFormatter={(tick) => tick.split(' ')[0]} // Show just date
                          minTickGap={30}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          hide={false}
                          orientation="right"
                          tick={{ fill: '#71717a', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#050505", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
                          itemStyle={{ color: color, fontFamily: "monospace", fontSize: "16px", fontWeight: "bold" }}
                          labelStyle={{ color: "#a1a1aa", fontSize: "12px", marginBottom: "4px" }}
                          formatter={(val: number) => [\`\${val.toFixed(2)} د.ل\`, chartAnalysisCurrency === 'GOLD' ? 'جرام كسر 18' : chartAnalysisCurrency]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke={color} 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorAnalysis)"
                          animationDuration={1000}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  );
                })() : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-500"></div>
                  </div>
                )}
              </div>
              
              {/* ملخص الإحصائيات أسفل الرسم */}
              {history.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                  {[
                    { label: 'أعلى سعر', calc: (arr: number[]) => Math.max(...arr) },
                    { label: 'أقل سعر', calc: (arr: number[]) => Math.min(...arr) },
                    { label: 'متوسط السعر', calc: (arr: number[]) => arr.reduce((a,b)=>a+b,0)/arr.length },
                    { label: 'التغير', calc: (arr: number[]) => arr[arr.length-1] - arr[0] }
                  ].map((stat, i) => {
                    const now = new Date();
                    let cutoff = new Date(0);
                    if (chartAnalysisRange === '1w') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (chartAnalysisRange === '1m') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (chartAnalysisRange === '6m') cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                    if (chartAnalysisRange === '1y') cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    
                    const values = history
                      .filter(h => new Date(h.time) >= cutoff)
                      .map(h => {
                        if (chartAnalysisCurrency === 'USD') return h.rates?.parallel?.USD;
                        if (chartAnalysisCurrency === 'EUR') return h.rates?.parallel?.EUR;
                        if (chartAnalysisCurrency === 'GBP') return h.rates?.parallel?.GBP;
                        if (chartAnalysisCurrency === 'GOLD') return h.rates?.gold?.karat18;
                        return 0;
                      }).filter(v => v > 0);
                      
                    const val = values.length > 0 ? stat.calc(values) : 0;
                    const isChange = i === 3;
                    const isPositive = val > 0;
                    
                    return (
                      <div key={i} className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{stat.label}</span>
                        <span className={\`font-mono font-bold \${isChange ? (isPositive ? 'text-emerald-400' : 'text-rose-400') : 'text-white'}\`}>
                          {isChange ? (isPositive ? '+' : '') : ''}{val.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
`;

if (!app.includes('id="charts-section"')) {
  app = app.replace(
    '<section id="currency-converter-section"',
    chartsSection + '\n\n        <section id="currency-converter-section"'
  );
}

// 5. Add to bottom navigation
// Locate bottom nav rendering
const navItemPattern = /\{activeTab === 'converter' && \(\s*<div className="absolute -bottom-1 left-1\/2 -translate-x-1\/2 w-1 h-1 bg-blue-400 rounded-full" \/>\s*\)\}\s*<\/button>/;
const navItemCharts = `
            {/* زر التحليل */}
            <button
              onClick={() => {
                setActiveTab('charts');
                triggerHaptic(10);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={\`relative flex flex-col items-center gap-1 p-2 transition-all \${
                activeTab === 'charts' ? 'text-fuchsia-400' : 'text-zinc-500 hover:text-zinc-400'
              }\`}
            >
              <LineChart className={\`w-5 h-5 transition-transform \${activeTab === 'charts' ? 'scale-110' : ''}\`} />
              <span className="text-[10px] font-bold">التحليل</span>
              {activeTab === 'charts' && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-fuchsia-400 rounded-full" />
              )}
            </button>
`;
if (!app.includes('activeTab === \'charts\' ? \'text-fuchsia-400\'')) {
  app = app.replace(navItemPattern, "$&\n" + navItemCharts);
}

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Charts section added');
