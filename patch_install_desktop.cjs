const fs = require('fs');
let app = fs.readFileSync('src/components/AppInstallUninstall.tsx', 'utf8');

const targetState = `const [showIOSInstallInfo, setShowIOSInstallInfo] = useState(false);`;
const replaceState = `const [showIOSInstallInfo, setShowIOSInstallInfo] = useState(false);
  const [showDesktopInstallInfo, setShowDesktopInstallInfo] = useState(false);`;

const targetClick = `  const handleInstallClick = () => {
    if (os === 'ios') {
      setShowIOSInstallInfo(true);
    } else if (canInstall) {
      promptInstall();
    } else {
      // Fallback if beforeinstallprompt hasn't fired but they want to install
      alert('الرجاء استخدام خيار "تثبيت التطبيق" أو "الإضافة للشاشة الرئيسية" من قائمة المتصفح.');
    }
  };`;
const replaceClick = `  const handleInstallClick = () => {
    if (os === 'ios') {
      setShowIOSInstallInfo(true);
    } else if (canInstall) {
      promptInstall();
    } else {
      // Fallback if beforeinstallprompt hasn't fired
      if (os === 'desktop' || os === 'unknown') {
        setShowDesktopInstallInfo(true);
      } else {
        alert('الرجاء استخدام خيار "تثبيت التطبيق" أو "الإضافة للشاشة الرئيسية" من قائمة المتصفح.');
      }
    }
  };`;

const targetUI = `        {showIOSInstallInfo && (`;
const desktopUI = `
        {showDesktopInstallInfo && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
              dir="rtl"
            >
              <button 
                onClick={() => setShowDesktopInstallInfo(false)}
                className="absolute top-4 left-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/30 text-emerald-400">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">تثبيت التطبيق على الكمبيوتر</h3>
              <p className="text-sm text-zinc-400 mb-6">يبدو أن المتصفح لم يظهر رسالة التثبيت التلقائية. يمكنك التثبيت يدوياً:</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0 font-bold font-mono">
                    ⋮
                  </div>
                  <p className="text-sm text-zinc-300">1. اضغط على أيقونة <strong>النقاط الثلاث</strong> أعلى يسار/يمين المتصفح (Chrome/Edge).</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-zinc-300">2. ابحث عن خيار <strong>تثبيت التطبيق (Install App)</strong> أو <strong>Save and Share &gt; Install</strong>.</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 shrink-0 font-bold text-xl pb-2">
                    ⤓
                  </div>
                  <p className="text-sm text-zinc-300">ملاحظة: يمكنك أيضاً إيجاد أيقونة التثبيت <strong>مباشرة في شريط العنوان (URL bar)</strong> بجانب النجمة.</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowDesktopInstallInfo(false)}
                className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
              >
                حسناً، فهمت
              </button>
            </motion.div>
          </div>
        )}
`;

if (app.includes(targetState)) {
  app = app.replace(targetState, replaceState);
  app = app.replace(targetClick, replaceClick);
  app = app.replace(targetUI, desktopUI + targetUI);
  fs.writeFileSync('src/components/AppInstallUninstall.tsx', app, 'utf8');
  console.log('Patched AppInstallUninstall.tsx');
} else {
  console.log('Failed to find targets');
}
