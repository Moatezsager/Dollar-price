import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Settings, Save, Plus, Trash2, ArrowRight, ShieldCheck, LogOut } from "lucide-react";

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (token) {
      fetchConfig();
    }
  }, [token]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem("adminToken");
        setToken("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem("adminToken", data.token);
        setIsLoggedIn(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("خطأ في الاتصال");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم حفظ الإعدادات بنجاح وتحديث السيرفر!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("خطأ في الحفظ");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken("");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">لوحة التحكم</h1>
          <p className="text-zinc-500 text-center mb-8 text-sm">أدخل كلمة المرور للوصول إلى الإعدادات</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-center"
                dir="ltr"
              />
            </div>
            {error && <p className="text-rose-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "جاري التحقق..." : "دخول"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Settings className="w-6 h-6 text-emerald-400" />
              إعدادات النظام (Admin)
            </h1>
            <p className="text-zinc-500 text-sm mt-1">تحكم كامل في مصادر البيانات والمصطلحات</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للموقع
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              تسجيل خروج
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition-colors disabled:opacity-50 flex-1 sm:flex-none justify-center"
            >
              <Save className="w-4 h-4" />
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </header>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl mb-8 flex items-center justify-center">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-8 flex items-center justify-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Channels Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-emerald-400">مصادر التليجرام</h2>
                <button
                  onClick={() => setConfig({ ...config, channels: [...config.channels, ""] })}
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {config.channels.map((channel: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-sm">t.me/s/</span>
                    <input
                      type="text"
                      value={channel}
                      onChange={(e) => {
                        const newChannels = [...config.channels];
                        newChannels[idx] = e.target.value;
                        setConfig({ ...config, channels: newChannels });
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                      dir="ltr"
                    />
                    <button
                      onClick={() => {
                        const newChannels = config.channels.filter((_: any, i: number) => i !== idx);
                        setConfig({ ...config, channels: newChannels });
                      }}
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Terms Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-6 min-w-[600px]">
                <div>
                  <h2 className="text-lg font-bold text-blue-400">المصطلحات وقواعد البحث (Regex)</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    كيف يتعرف النظام على الأسعار من النصوص. يجب أن يحتوي الـ Regex على مجموعة التقاط واحدة `()` للرقم.
                  </p>
                </div>
                <button
                  onClick={() => setConfig({
                    ...config,
                    terms: [...config.terms, { id: "NEW", name: "عملة جديدة", regex: "", min: 0, max: 100, isInverse: false, flag: "" }]
                  })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مصطلح
                </button>
              </div>

              <div className="min-w-[800px]">
                <table className="w-full text-left border-collapse" dir="rtl">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 font-medium w-[15%]">المعرف (ID)</th>
                      <th className="pb-3 font-medium w-[20%]">الاسم المعروض</th>
                      <th className="pb-3 font-medium w-[30%]">قاعدة البحث (Regex)</th>
                      <th className="pb-3 font-medium w-[10%] text-center">الحد الأدنى</th>
                      <th className="pb-3 font-medium w-[10%] text-center">الحد الأقصى</th>
                      <th className="pb-3 font-medium w-[10%] text-center">العلم (كود)</th>
                      <th className="pb-3 font-medium w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {config.terms.map((term: any, idx: number) => (
                      <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-2">
                          <input
                            type="text"
                            value={term.id}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[idx].id = e.target.value;
                              setConfig({ ...config, terms: newTerms });
                            }}
                            className="w-full bg-transparent border border-transparent group-hover:border-white/10 rounded px-2 py-1 text-sm font-mono focus:bg-white/5 focus:outline-none"
                            dir="ltr"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="text"
                            value={term.name}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[idx].name = e.target.value;
                              setConfig({ ...config, terms: newTerms });
                            }}
                            className="w-full bg-transparent border border-transparent group-hover:border-white/10 rounded px-2 py-1 text-sm focus:bg-white/5 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="text"
                            value={term.regex}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[idx].regex = e.target.value;
                              setConfig({ ...config, terms: newTerms });
                            }}
                            className="w-full bg-transparent border border-transparent group-hover:border-white/10 rounded px-2 py-1 text-xs font-mono text-emerald-300 focus:bg-white/5 focus:outline-none"
                            dir="ltr"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="number"
                            value={term.min}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[idx].min = parseFloat(e.target.value);
                              setConfig({ ...config, terms: newTerms });
                            }}
                            className="w-full bg-transparent border border-transparent group-hover:border-white/10 rounded px-2 py-1 text-sm text-center focus:bg-white/5 focus:outline-none"
                            dir="ltr"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="number"
                            value={term.max}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[idx].max = parseFloat(e.target.value);
                              setConfig({ ...config, terms: newTerms });
                            }}
                            className="w-full bg-transparent border border-transparent group-hover:border-white/10 rounded px-2 py-1 text-sm text-center focus:bg-white/5 focus:outline-none"
                            dir="ltr"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="text"
                            value={term.flag || ""}
                            onChange={(e) => {
                              const newTerms = [...config.terms];
                              newTerms[idx].flag = e.target.value;
                              setConfig({ ...config, terms: newTerms });
                            }}
                            placeholder="us, eu..."
                            className="w-full bg-transparent border border-transparent group-hover:border-white/10 rounded px-2 py-1 text-sm text-center focus:bg-white/5 focus:outline-none"
                            dir="ltr"
                          />
                        </td>
                        <td className="py-3 pl-2 text-left">
                          <button
                            onClick={() => {
                              const newTerms = config.terms.filter((_: any, i: number) => i !== idx);
                              setConfig({ ...config, terms: newTerms });
                            }}
                            className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
