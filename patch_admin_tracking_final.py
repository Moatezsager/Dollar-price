import re

with open('src/Admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure we import 'Monitor', 'Smartphone', 'Tablet' etc. from lucide-react if not present, but for safety I will just use existing Cpu and Globe, plus some basic ones like Monitor/Smartphone which might be there.
# Let's check imports
if 'Monitor' not in content:
    content = content.replace("import {", "import { Monitor, Smartphone, Layout, Wifi, Clock, Chrome, Compass, AppWindow, ", 1)

old_table_regex = re.compile(r'<table className="w-full text-right">.*?</table>', re.DOTALL)

new_table = """<table className="w-full text-right">
                    <thead>
                      <tr className="bg-white/[0.02] text-zinc-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="px-6 py-4">حالة الاتصال</th>
                        <th className="px-6 py-4">الجهاز والنظام</th>
                        <th className="px-6 py-4">الشبكة (IP)</th>
                        <th className="px-6 py-4">التفاعل</th>
                        <th className="px-6 py-4">المتصفح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <Users className="w-10 h-10 text-zinc-800" />
                              <p className="text-zinc-600">لا توجد أجهزة مسجلة حالياً.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        userLogs.map((log) => {
                          const isOnline = new Date().getTime() - new Date(log.timestamp).getTime() < 3 * 60 * 1000;
                          return (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-zinc-600'}`}></div>
                                  <span className={`text-[10px] font-bold ${isOnline ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    {isOnline ? 'متصل الآن' : 'غير متصل'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 pr-4">
                                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: ar })}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                  log.deviceType === 'Mobile' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                   log.deviceType === 'Tablet' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                   log.deviceType === 'Bot' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {log.deviceType === 'Mobile' ? <Smartphone className="w-5 h-5" /> : 
                                   log.deviceType === 'Tablet' ? <Layout className="w-5 h-5" /> : 
                                   <Monitor className="w-5 h-5" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-white">{log.deviceName || log.deviceType}</span>
                                  <span className="text-[10px] text-zinc-400 font-medium bg-white/5 px-2 py-0.5 rounded-md inline-block w-fit mt-1">
                                    {log.os || 'نظام غير معروف'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                                  <Wifi className="w-3 h-3 text-zinc-500" />
                                  {log.ip}
                                </span>
                                {log.firstVisit && (
                                  <span className="text-[9px] text-zinc-500 flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    أول زيارة: {new Date(log.firstVisit).toLocaleTimeString('ar-LY')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 max-w-[80px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${Math.min(((log.visits || 1) / 50) * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 min-w-[2rem] text-center">
                                  {log.visits || 1}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                  <AppWindow className="w-3.5 h-3.5 text-zinc-400" />
                                  {log.browser || 'متصفح غير معروف'}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[120px] mt-1" title={log.userAgent}>
                                  {log.userAgent}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )})
                      )}
                    </tbody>
                  </table>"""

content = old_table_regex.sub(new_table, content)

with open('src/Admin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched Admin.tsx tracking table successfully.")
