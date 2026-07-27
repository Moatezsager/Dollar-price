const fs = require('fs');
let code = fs.readFileSync('src/Admin.tsx', 'utf8');

const targetStr = `                  <button 
                    onClick={fetchLogs}
                    className="p-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all border border-white/5"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>`;

const replaceStr = `                  <div className="flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        if (window.confirm("هل أنت متأكد من مسح جميع سجلات الأخطاء؟")) {
                          try {
                            const res = await fetch("/api/admin/error-logs", {
                              method: "DELETE",
                              headers: { Authorization: \`Bearer \${token}\` }
                            });
                            if (res.ok) {
                              setLogs([]);
                              setSuccess("تم مسح السجلات بنجاح");
                              setTimeout(() => setSuccess(""), 3000);
                            }
                          } catch (e) {
                            setError("فشل مسح السجلات");
                            setTimeout(() => setError(""), 3000);
                          }
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20 text-sm"
                    >
                      تنظيف السجل
                    </button>
                    <button 
                      onClick={fetchLogs}
                      className="p-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all border border-white/5"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/Admin.tsx', code);
console.log('patched Admin.tsx for clearing logs');
