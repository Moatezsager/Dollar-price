import re

with open('src/Admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

facebook_ui = """                {/* Facebook Auto Post Settings */}
                <div className="mt-12 space-y-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    إعدادات النشر التلقائي - فيسبوك
                  </h3>
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold">النشر التلقائي على فيسبوك</p>
                        <p className="text-sm text-zinc-500">نشر التحديثات لصفحة فيسبوك في نفس لحظة النشر لتيليجرام</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={config?.facebookAutoPost || false}
                          onChange={(e) => {
                            setConfig({ ...config, facebookAutoPost: e.target.checked });
                          }}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-zinc-400 mb-2">مُعرف الصفحة (Page ID)</label>
                      <input
                        type="text"
                        value={config?.facebookPageId || ''}
                        onChange={(e) => setConfig({ ...config, facebookPageId: e.target.value })}
                        placeholder="مثال: 104523521235"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-400 mb-2">رمز وصول الصفحة (Page Access Token)</label>
                      <input
                        type="password"
                        value={config?.facebookAccessToken || ''}
                        onChange={(e) => setConfig({ ...config, facebookAccessToken: e.target.value })}
                        placeholder="EAABw..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                        dir="ltr"
                      />
                    </div>
                    
                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
                      >
                        حفظ الإعدادات
                      </button>
                    </div>
                  </div>
                </div>

"""

target = "{!config?.telegramSessionString && ("
content = content.replace(target, facebook_ui + target)

with open('src/Admin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
