import React from 'react';
import { motion } from 'motion/react';
import { Lock, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

interface LoginViewProps {
  login: (password: string) => Promise<boolean>;
  loading: boolean;
  error: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ login, loading, error }) => {
  const [password, setPassword] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(password);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#0a0a0a] animate-ping opacity-20"></div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">الدخول الآمن</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">يرجى إدخال مفتاح الوصول الإداري للمتابعة</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all text-center text-2xl tracking-[0.3em] font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-zinc-700"
              dir="ltr"
              required
            />
            <div className="absolute inset-0 rounded-2xl border border-emerald-500/0 group-focus-within:border-emerald-500/20 pointer-events-none transition-all"></div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-rose-400 text-sm text-center flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            {loading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span className="text-lg">فتح لوحة التحكم</span>
                <Zap className="w-5 h-5 group-hover:fill-current transition-all" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
