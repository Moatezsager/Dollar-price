import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Globe, Plus, Send, Trash2, Search, ArrowUpDown, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { RegexEditor } from './RegexEditor';
import { FlagIcon } from '../FlagIcon';

interface ConfigTabProps {
  config: any;
  setConfig: (config: any) => void;
  onSave: () => void;
  loading: boolean;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({ config, setConfig, onSave, loading }) => {
  const [searchPath, setSearchPath] = useState("");
  const [expandedTermIdx, setExpandedTermIdx] = useState<number | null>(null);

  const filteredTerms = useMemo(() => {
    if (!config?.terms) return [];
    if (!searchPath) return config.terms;
    return config.terms.filter((t: any) => 
      t.name.toLowerCase().includes(searchPath.toLowerCase()) || 
      t.id.toLowerCase().includes(searchPath.toLowerCase())
    );
  }, [config, searchPath]);

  if (!config) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 md:space-y-8 pb-24"
    >
      {/* Channels Section */}
      <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg md:text-xl font-black flex items-center gap-3 text-blue-400">
            <Globe className="w-5 h-5 md:w-6 md:h-6" />
            مصادر البيانات (Channels)
          </h2>
          <button 
            onClick={() => setConfig({...config, channels: [...config.channels, '']})}
            className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.channels.map((ch: string, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <input 
                value={ch}
                onChange={(e) => {
                  const newChannels = [...config.channels];
                  newChannels[i] = e.target.value;
                  setConfig({...config, channels: newChannels});
                }}
                placeholder="اسم القناة (بدون @)"
                className="flex-1 bg-transparent border-none focus:ring-0 text-white font-bold text-sm"
                dir="ltr"
              />
              <button 
                onClick={() => {
                  const newChannels = config.channels.filter((_: any, idx: number) => idx !== i);
                  setConfig({...config, channels: newChannels});
                }}
                className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Terms/Extraction Section */}
      <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h2 className="text-lg md:text-xl font-black flex items-center gap-3 text-emerald-400 shadow-sm">
            <ArrowUpDown className="w-5 h-5 md:w-6 md:h-6" />
            قواعد الاستخراج (Terms)
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                value={searchPath}
                onChange={(e) => setSearchPath(e.target.value)}
                placeholder="بحث في العملات..."
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-all w-full md:w-64"
              />
            </div>
            <button 
              onClick={() => {
                const newTerm = { id: 'NEW_ID', name: 'عملة جديدة', regex: '(?:كلمة1|كلمة2)', min: 0, max: 100, isInverse: false, flag: '💰' };
                setConfig({...config, terms: [newTerm, ...config.terms]});
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs flex items-center gap-2 hover:bg-emerald-400 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              إضافة
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredTerms.map((term: any, i: number) => {
            const isExpanded = expandedTermIdx === i;
            return (
              <div key={term.id} className={`rounded-3xl border transition-all overflow-hidden ${isExpanded ? 'bg-white/[0.04] border-emerald-500/30 shadow-2xl shadow-emerald-500/5' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.03]'}`}>
                <div 
                  className="p-4 md:p-6 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedTermIdx(isExpanded ? null : i)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                      {term.flag || <FlagIcon flagCode={term.id.slice(0, 2).toLowerCase()} name={term.name} className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        {term.name}
                        <span className="text-[10px] text-zinc-500 font-mono bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{term.id}</span>
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-widest truncate max-w-[200px]" dir="ltr">{term.regex.slice(0, 50)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm("هل أنت متأكد من حذف هذه القاعدة؟")) return;
                        const newTerms = config.terms.filter((_: any, idx: number) => idx !== i);
                        setConfig({...config, terms: newTerms});
                      }}
                      className="p-3 rounded-xl hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-emerald-500/20 text-emerald-400' : 'text-zinc-600'}`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest pl-2">اسم المسمى</label>
                          <input 
                            value={term.name}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[i] = { ...term, name: e.target.value };
                              setConfig({...config, terms: newTerms});
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest pl-2">المسار (ID)</label>
                          <input 
                            value={term.id}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[i] = { ...term, id: e.target.value.toUpperCase() };
                              setConfig({...config, terms: newTerms});
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-emerald-400 font-mono focus:border-emerald-500/50 outline-none"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest pl-2">أدنى سعر (Min)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={term.min}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[i] = { ...term, min: parseFloat(e.target.value) };
                              setConfig({...config, terms: newTerms});
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest pl-2">أعلى سعر (Max)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={term.max}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[i] = { ...term, max: parseFloat(e.target.value) };
                              setConfig({...config, terms: newTerms});
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                        <div>
                          <h4 className="text-xs font-bold text-white mb-1">القيم العكسية (1/X)</h4>
                          <p className="text-[10px] text-zinc-500">تستخدم للعملات مثل الدينار التونسي والمصري</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={term.isInverse}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[i] = { ...term, isInverse: e.target.checked };
                              setConfig({...config, terms: newTerms});
                            }}
                          />
                          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <RegexEditor 
                        regex={term.regex} 
                        onChange={(val) => {
                          const newTerms = [...config.terms];
                          newTerms[i] = { ...term, regex: val };
                          setConfig({...config, terms: newTerms});
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
};
