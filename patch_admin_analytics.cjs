const fs = require('fs');
let code = fs.readFileSync('src/Admin.tsx', 'utf8');

const importStr = `import { useState, useEffect, useRef } from "react";`;
const newImportStr = `import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";`;

if (code.includes(importStr) && !code.includes('recharts')) {
    code = code.replace(importStr, newImportStr);
}

const stateStr = `  const [userLogs, setUserLogs] = useState<any[]>([]);`;
const newStateStr = `  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);`;

if (code.includes(stateStr) && !code.includes('analyticsData')) {
    code = code.replace(stateStr, newStateStr);
}

const fetchStr = `  const fetchTrackingLogs = async () => {`;
const newFetchStr = `  const fetchTrackingLogs = async () => {
    // Also fetch advanced analytics
    fetchAnalyticsDashboard();
    
    // original code continues...
`;

if (code.includes(fetchStr) && !code.includes('fetchAnalyticsDashboard()')) {
    code = code.replace(fetchStr, newFetchStr);
}

const fetchAnalyticsStr = `  const fetchLiveFeed = async () => {`;
const newFetchAnalyticsStr = `  const fetchAnalyticsDashboard = async () => {
    try {
      const res = await fetch(\`/api/admin/analytics?days=\${analyticsDays}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.warn("Analytics fetch failed", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'tracking' && token) {
      fetchAnalyticsDashboard();
    }
  }, [analyticsDays, token, activeTab]);

  const fetchLiveFeed = async () => {`;

if (code.includes(fetchAnalyticsStr) && !code.includes('fetchAnalyticsDashboard = async')) {
    code = code.replace(fetchAnalyticsStr, newFetchAnalyticsStr);
}

const trackingTabStr = `          {activeTab === 'tracking' && (
            <motion.div 
              key="tracking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                      <Activity className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        زوار الموقع المباشر (Live)
                        <span className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          {userLogs.filter(l => l.status === 'online').length} متصل الآن
                        </span>
                      </h2>
                      <p className="text-sm text-zinc-400 mt-1">
                        مراقبة فورية للأجهزة المتصلة بالموقع، عناوين IP، نوع المتصفح ونظام التشغيل في الوقت الفعلي
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={fetchTrackingLogs}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all"
                    >
                      تحديث السجل
                    </button>
                  </div>
                </div>
              </div>`;
              
const newTrackingTabStr = `          {activeTab === 'tracking' && (
            <motion.div 
              key="tracking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Analytics Dashboard Header */}
              <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                      <BarChart3 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        إحصائيات الزوار (Analytics)
                        <span className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          {userLogs.filter(l => l.status === 'online').length} مباشر
                        </span>
                      </h2>
                      <p className="text-sm text-zinc-400 mt-1">
                        نظام إحصائيات متقدم لتتبع الزيارات، الأجهزة، المتصفحات، وأنظمة التشغيل بدقة عالية.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select 
                      value={analyticsDays}
                      onChange={(e) => setAnalyticsDays(parseInt(e.target.value))}
                      className="px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="1">آخر 24 ساعة</option>
                      <option value="7">آخر 7 أيام</option>
                      <option value="30">آخر 30 يوم</option>
                    </select>
                    <button 
                      onClick={() => { fetchAnalyticsDashboard(); fetchTrackingLogs(); }}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all"
                    >
                      تحديث البيانات
                    </button>
                  </div>
                </div>
              </div>

              {/* Analytics Graphs (Recharts) */}
              {analyticsData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Trend Chart */}
                  <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <LineChart className="w-5 h-5 text-emerald-400" />
                      الزيارات والزوار (أخر {analyticsDays} أيام)
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.trend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#000000dd', borderColor: '#ffffff20', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" name="عدد الزيارات" dataKey="pageviews" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPv)" />
                          <Area type="monotone" name="الزوار الفريدين" dataKey="visitors" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="space-y-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center flex flex-col justify-center h-32">
                      <div className="text-4xl font-black text-emerald-400 mb-1">{analyticsData.summary.totalPageviews.toLocaleString()}</div>
                      <div className="text-sm font-medium text-emerald-500/80">إجمالي الزيارات (Pageviews)</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6 text-center flex flex-col justify-center h-32">
                      <div className="text-4xl font-black text-blue-400 mb-1">{analyticsData.summary.totalVisitors.toLocaleString()}</div>
                      <div className="text-sm font-medium text-blue-500/80">زوار فريدين (Unique)</div>
                    </div>
                  </div>
                  
                  {/* Device Types Pie/Bar */}
                  <div className="bg-black/40 border border-white/10 rounded-3xl p-6">
                     <h3 className="text-lg font-bold text-white mb-6">أنواع الأجهزة</h3>
                     <div className="space-y-4">
                       {Object.entries(analyticsData.deviceTypes).sort((a:any, b:any) => b[1] - a[1]).map(([device, count]: any) => (
                         <div key={device}>
                           <div className="flex justify-between text-sm mb-2">
                             <span className="text-zinc-300">{device === 'Mobile' ? 'هاتف ذكي' : device === 'Desktop' ? 'حاسوب' : device === 'Tablet' ? 'جهاز لوحي' : 'بوتات وبرمجيات'}</span>
                             <span className="font-bold text-white">{count}</span>
                           </div>
                           <div className="w-full bg-white/5 rounded-full h-2">
                             <div className="bg-emerald-500 h-2 rounded-full" style={{ width: \`\${Math.min(100, (count / analyticsData.summary.totalPageviews) * 100)}%\` }}></div>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>

                  {/* Top Browsers */}
                  <div className="bg-black/40 border border-white/10 rounded-3xl p-6">
                     <h3 className="text-lg font-bold text-white mb-6">المتصفحات</h3>
                     <div className="space-y-4">
                       {Object.entries(analyticsData.browsers).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5).map(([browser, count]: any) => (
                         <div key={browser}>
                           <div className="flex justify-between text-sm mb-2">
                             <span className="text-zinc-300">{browser}</span>
                             <span className="font-bold text-white">{count}</span>
                           </div>
                           <div className="w-full bg-white/5 rounded-full h-2">
                             <div className="bg-blue-500 h-2 rounded-full" style={{ width: \`\${Math.min(100, (count / analyticsData.summary.totalPageviews) * 100)}%\` }}></div>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>

                  {/* Top OS */}
                  <div className="bg-black/40 border border-white/10 rounded-3xl p-6">
                     <h3 className="text-lg font-bold text-white mb-6">أنظمة التشغيل</h3>
                     <div className="space-y-4">
                       {Object.entries(analyticsData.os).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5).map(([os, count]: any) => (
                         <div key={os}>
                           <div className="flex justify-between text-sm mb-2">
                             <span className="text-zinc-300">{os}</span>
                             <span className="font-bold text-white">{count}</span>
                           </div>
                           <div className="w-full bg-white/5 rounded-full h-2">
                             <div className="bg-purple-500 h-2 rounded-full" style={{ width: \`\${Math.min(100, (count / analyticsData.summary.totalPageviews) * 100)}%\` }}></div>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              )}

              {/* Title for Realtime Logs */}
              <div className="flex items-center gap-3 pt-6 border-t border-white/10">
                 <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                 <h3 className="text-xl font-bold text-white">سجل الزوار المباشر (Real-time Live Logs)</h3>
              </div>
`;

if (code.includes(trackingTabStr)) {
    code = code.replace(trackingTabStr, newTrackingTabStr);
    fs.writeFileSync('src/Admin.tsx', code, 'utf8');
    console.log("Patched Admin.tsx tracking tab.");
} else {
    console.log("Could not patch Admin.tsx tracking tab.");
}
