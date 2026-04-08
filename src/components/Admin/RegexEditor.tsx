import React, { useState, useEffect, useMemo } from 'react';
import { Info, X } from 'lucide-react';

interface RegexEditorProps {
  regex: string;
  onChange: (val: string) => void;
}

export const RegexEditor: React.FC<RegexEditorProps> = ({ regex, onChange }) => {
  const [mode, setMode] = useState<'bubbles' | 'raw'>('bubbles');
  const [newWord, setNewWord] = useState('');

  const parsed = useMemo(() => {
    if (!regex.startsWith('(?:')) return null;
    let depth = 0;
    let alternatives = [];
    let currentAlt = '';
    let i = 3;
    for (; i < regex.length; i++) {
      const char = regex[i];
      if (char === '\\') {
        currentAlt += char + (regex[i + 1] || '');
        i++;
        continue;
      }
      if (char === '(') depth++;
      if (char === ')') depth--;

      if (depth < 0) {
        alternatives.push(currentAlt);
        break;
      }

      if (char === '|' && depth === 0) {
        alternatives.push(currentAlt);
        currentAlt = '';
      } else {
        currentAlt += char;
      }
    }

    if (depth >= 0) return null;

    const suffix = regex.slice(i + 1);
    return { alternatives, suffix };
  }, [regex]);

  useEffect(() => {
    if (!parsed && mode === 'bubbles') {
      setMode('raw');
    }
  }, [parsed, mode]);

  const removeWord = (index: number) => {
    if (!parsed) return;
    const newAlts = [...parsed.alternatives];
    newAlts.splice(index, 1);
    onChange(`(?:${newAlts.join('|')})${parsed.suffix}`);
  };

  const addWord = () => {
    if (!parsed || !newWord.trim()) return;
    const newAlts = [...parsed.alternatives, newWord.trim()];
    onChange(`(?:${newAlts.join('|')})${parsed.suffix}`);
    setNewWord('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">محرر REGEX المتقدم</label>
          <Info className="w-4 h-4 text-zinc-700 hover:text-emerald-400 cursor-help" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('bubbles')}
            className={`text-[10px] px-2 py-1 rounded-md transition-colors ${mode === 'bubbles' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            disabled={!parsed}
          >
            فقاعات
          </button>
          <button
            onClick={() => setMode('raw')}
            className={`text-[10px] px-2 py-1 rounded-md transition-colors ${mode === 'raw' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
          >
            نص خام
          </button>
        </div>
      </div>

      {mode === 'bubbles' && parsed ? (
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {parsed.alternatives.map((alt, i) => (
              <div key={i} className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono">
                <span dir="ltr">{alt}</span>
                <button
                  onClick={() => removeWord(i)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-rose-500/20 text-rose-400 transition-colors mr-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWord()}
              placeholder="إضافة كلمة جديدة..."
              className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/30 text-white font-mono"
              dir="ltr"
            />
            <button
              onClick={addWord}
              className="px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition-colors"
            >
              إضافة
            </button>
          </div>
        </div>
      ) : (
        <textarea
          value={regex}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-24 bg-transparent border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400 focus:border-emerald-500/50 outline-none resize-none leading-relaxed"
          dir="ltr"
        />
      )}
    </div>
  );
};
