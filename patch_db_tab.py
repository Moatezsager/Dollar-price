with open('src/Admin.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

# Find the <thead> that comes right after <table className="w-full text-right"> inside activeTab === 'database'
in_db_tab = False
for i, line in enumerate(lines):
    if "activeTab === 'database'" in line:
        in_db_tab = True
    if in_db_tab and '<table className="w-full text-right">' in line:
        start_idx = i + 1
    if start_idx != -1 and i > start_idx and '</table>' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    good_table = """                    <thead>
                      <tr className="bg-white/[0.02] text-zinc-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="px-6 py-4">التاريخ والوقت</th>
                        <th className="px-6 py-4 text-center">السعر</th>
                        <th className="px-6 py-4 text-left">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dbRecords.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <Database className="w-10 h-10 text-zinc-800" />
                              <p className="text-zinc-600">لا توجد سجلات حالياً لهذه العملة في هذا السوق.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        dbRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4" dir="ltr">
                              <span className="text-sm text-zinc-300 font-mono">
                                {new Date(record.recorded_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {editingRecord === record.id ? (
                                <input
                                  type="number"
                                  step="0.001"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="bg-black/50 border border-emerald-500/50 rounded-lg px-3 py-1.5 text-white w-32 focus:outline-none focus:border-emerald-500 text-center"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-base font-bold text-emerald-400 font-mono">
                                  {record.value?.toFixed(3)}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {editingRecord === record.id ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateRecord(record.id)}
                                      className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                                      title="حفظ"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingRecord(null)}
                                      className="p-1.5 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 rounded-lg transition-colors"
                                      title="إلغاء"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingRecord(record.id);
                                        setEditValue(record.value?.toString() || '');
                                      }}
                                      className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                      title="تعديل"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(record.id)}
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                      title="حذف"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>\n"""
    
    new_lines = lines[:start_idx] + [good_table] + lines[end_idx:]
    with open('src/Admin.tsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Success")
else:
    print("Failed to find boundaries")
