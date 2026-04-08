import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Database, Filter, Search, Trash2, Edit2, Check, X, RefreshCw, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, MousePointer2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DatabaseTabProps {
  market: 'parallel' | 'official';
  setMarket: (m: 'parallel' | 'official') => void;
  currency: string;
  setCurrency: (c: string) => void;
  records: any[];
  loading: boolean;
  onRefresh: () => void;
  onUpdate: (id: string, value: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  configTerms: any[];
}

export const DatabaseTab: React.FC<DatabaseTabProps> = ({
  market, setMarket, currency, setCurrency, records, loading, onRefresh, onUpdate, onDelete, configTerms
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setEditValue(record.usd?.toString() || (record.rates?.[currency]?.toString() || ""));
  };

  const handleSave = async (id: string) => {
    const success = await onUpdate(id, editValue);
    if (success) setEditingId(null);
  };

  const filteredRecords = records.filter(r => 
    r.recorded_at?.includes(searchTerm) || 
    r.usd?.toString().includes(searchTerm)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Database className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">سجلات البيانات</h2>
            <p className="text-zinc-500 text-xs font-bold mt-1">إدارة وحذف السجلات القديمة من {market === 'parallel' ? 'السوق الموازي' : 'السعر الرسمي'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white/5 border border-white/5 rounded-xl p-1">
            <button
              onClick={() => setMarket('parallel')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${market === 'parallel' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              موازي
            </button>
            <button
              onClick={() => setMarket('official')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${market === 'official' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              رسمي
            </button>
          </div>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 appearance-none min-w-[120px]"
          >
            {configTerms.map(t => (
              <option key={t.id} value={t.id} className="bg-zinc-900">{t.name}</option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-zinc-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-zinc-500" />
            <h3 className="font-bold">تصفية السجلات</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث في التواريخ أو الأسعار..."
              className="bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/30 w-full md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white/[0.01] border-b border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                <th className="px-8 py-5">الوقت والتاريخ</th>
                <th className="px-6 py-5">السعر</th>
                <th className="px-6 py-5">التغير</th>
                <th className="px-6 py-5 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((record, i) => {
                const isEditing = editingId === record.id;
                const value = record.usd || record.rates?.[currency] || 0;
                const prevValue = filteredRecords[i + 1]?.usd || filteredRecords[i + 1]?.rates?.[currency] || value;
                const change = value - prevValue;
                const isUp = change >= 0;

                return (
                  <tr key={record.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500">
                            <Clock className="w-4 h-4" />
                         </div>
                         <div>
                            <div className="text-sm font-bold text-white">{format(new Date(record.recorded_at), 'd MMMM yyyy', { locale: ar })}</div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{format(new Date(record.recorded_at), 'HH:mm:ss')}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-black border border-blue-500/50 rounded-lg px-2 py-1 text-sm font-mono text-blue-400 w-32 outline-none"
                        />
                      ) : (
                        <span className="text-sm font-black text-white font-mono">{value.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                       {change !== 0 ? (
                         <div className={`flex items-center gap-1 text-[10px] font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(change).toFixed(2)}
                         </div>
                       ) : <span className="text-[10px] text-zinc-700">---</span>}
                    </td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSave(record.id)} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(record)} className="p-2 hover:bg-blue-500/10 text-zinc-500 hover:text-blue-400 rounded-lg transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(record.id)} className="p-2 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredRecords.length === 0 && (
          <div className="p-16 text-center text-zinc-600 flex flex-col items-center gap-4">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center opacity-20">
                <Database className="w-10 h-10" />
             </div>
             <p className="text-sm italic">لا توجد سجلات مطابقة لهذا البحث أو المصدر</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
