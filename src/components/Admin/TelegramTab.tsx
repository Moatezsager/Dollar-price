import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Send, ShieldCheck, Lock, RefreshCw, Smartphone, Key, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TelegramTabProps {
  config: any;
  onSendCode: (phone: string, apiId: string, apiHash: string) => Promise<any>;
  onVerifyCode: (code: string, password?: string) => Promise<boolean>;
  loading: boolean;
}

export const TelegramTab: React.FC<TelegramTabProps> = ({ config, onSendCode, onVerifyCode, loading }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [apiId, setApiId] = useState(config?.telegramApiId?.toString() || "");
  const [apiHash, setApiHash] = useState(config?.telegramApiHash || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<'init' | 'code' | 'password'>('init');
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    setError("");
    const res = await onSendCode(phoneNumber, apiId, apiHash);
    if (res?.success) {
      setStep('code');
    } else {
      setError(res?.message || "فشل إرسال الكود");
    }
  };

  const handleVerify = async () => {
    setError("");
    const success = await onVerifyCode(code, password);
    if (success) {
      setStep('init');
      setPhoneNumber("");
      setCode("");
      setPassword("");
    } else {
      setError("فشل التحقق من الكود أو كلمة المرور");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-4xl mx-auto space-y-8 pb-24"
    >
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
          <Globe className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">إدارة حساب تليجرام</h2>
        <p className="text-zinc-500 max-w-lg mx-auto">
          يستخدم النظام حساب تليجرام حقيقي لقراءة الرسائل من القنوات. تأكد من استخدام بيانات API صحيحة من my.telegram.org.
        </p>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32"></div>
        
        <AnimatePresence mode="wait">
          {step === 'init' && (
            <motion.div 
              key="init"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 relative"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest px-2">رقم الهاتف (بمفتاح الدولة)</label>
                  <div className="relative">
                    <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 transition-colors group-focus-within:text-blue-400" />
                    <input 
                      dir="ltr"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+2189..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest px-2">API ID</label>
                  <div className="relative">
                    <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                    <input 
                      dir="ltr"
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      placeholder="123456"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest px-2">API Hash</label>
                <input 
                  dir="ltr"
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  placeholder="0123456789abcdef..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs flex items-center gap-3">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button 
                onClick={handleSendCode}
                disabled={loading || !phoneNumber || !apiId || !apiHash}
                className="w-full py-5 bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-800 text-black font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 group"
              >
                {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>إرسال كود التحقق</span>
                    <Send className="w-5 h-5 transition-transform group-hover:translate-x-[-4px]" />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div 
              key="code"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 text-center"
            >
              <div>
                <h3 className="text-xl font-bold mb-2">أدخل الكود</h3>
                <p className="text-zinc-500 text-xs">تم إرسال كود التحقق إلى تطبيق تليجرام في هاتف {phoneNumber}</p>
              </div>

              <input 
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="00000"
                className="w-full max-w-xs mx-auto bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-blue-500/50 transition-all text-center text-3xl font-mono tracking-[0.5em]"
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('init')}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                >
                  رجوع
                </button>
                <button 
                  onClick={handleVerify}
                  disabled={loading || code.length < 3}
                  className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
                >
                  {loading ? <RefreshCw className="w-6 h-6 animate-spin mx-auto" /> : "تحقق وتأكيد"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div 
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 text-center"
            >
              <div>
                <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">كلمة مرور الحماية (2FA)</h3>
                <p className="text-zinc-500 text-xs">حسابك محمي بكلمة مرور الخطوتين، يرجى إدخالها للمتابعة.</p>
              </div>

              <input 
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full max-w-xs mx-auto bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-amber-500/50 transition-all text-center text-2xl font-mono"
              />

              <button 
                onClick={handleVerify}
                disabled={loading || !password}
                className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl transition-all shadow-xl shadow-amber-500/20"
              >
                {loading ? <RefreshCw className="w-6 h-6 animate-spin mx-auto" /> : "تأكيد الدخول"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {config?.telegramSessionString && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-white">الجاهزية</h4>
              <p className="text-[10px] text-emerald-500/70">توجد جلسة (Session) فعالة حالياً والمشروع جاهز للعمل.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-black">
            <CheckCircle2 className="w-4 h-4" />
            نشط
          </div>
        </div>
      )}
    </motion.div>
  );
};
