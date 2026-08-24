import re

with open('src/Admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_table = """                      <tr className="bg-white/[0.02] text-zinc-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="px-6 py-4">الجهاز</th>
                        <th className="px-6 py-4">IP</th>
                        <th className="px-6 py-4">المتصفح</th>
                        <th className="px-6 py-4">الوقت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <Users className="w-10 h-10 text-zinc-800" />
                              <p className="text-zinc-600">لا توجد أجهزة مسجلة حالياً.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        userLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  log.deviceType === 'Mobile' ? 'bg-blue-500/10 text-blue-400' :
                                   log.deviceType === 'Tablet' ? 'bg-purple-500/10 text-purple-400' :
                                   log.deviceType === 'Bot' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {log.deviceType === 'Mobile' ? <Cpu className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                </div>
                                <span className="text-sm font-bold text-white">{log.deviceName || log.deviceType}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-mono text-zinc-400">{log.ip}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px] block" title={log.userAgent}>
                                {log.userAgent}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] text-zinc-500">
                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: ar })}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}"""

new_table = """                      <tr className="bg-white/[0.02] text-zinc-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="px-6 py-4">الجهاز</th>
                        <th className="px-6 py-4">IP & الشبكة</th>
                        <th className="px-6 py-4">الزيارات</th>
                        <th className="px-6 py-4">المتصفح</th>
                        <th className="px-6 py-4">آخر نشاط</th>
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
                        userLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  log.deviceType === 'Mobile' ? 'bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' :
                                   log.deviceType === 'Tablet' ? 'bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' :
                                   log.deviceType === 'Bot' ? 'bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                }`}>
                                  {log.deviceType === 'Mobile' ? <Cpu className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-white">{log.deviceName || log.deviceType}</span>
                                  <span className="text-[10px] text-zinc-500">{log.deviceType}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-bold text-zinc-300">{log.ip}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-emerald-400">
                                  {log.visits || 1}
                                </div>
                                <span className="text-[10px] text-zinc-500">زيارات</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px] block" title={log.userAgent}>
                                {log.userAgent}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-[11px] text-white font-medium">
                                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: ar })}
                                </span>
                                {log.firstVisit && (
                                  <span className="text-[9px] text-zinc-500 mt-0.5" title="أول زيارة">
                                    دخول: {new Date(log.firstVisit).toLocaleTimeString('ar-LY')}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}"""

content = content.replace(old_table, new_table)

with open('src/Admin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched Admin.tsx")
