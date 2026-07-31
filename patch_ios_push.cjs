const fs = require('fs');
let code = fs.readFileSync('src/components/PushNotificationPrompt.tsx', 'utf8');

const oldCheck = `      // On iOS, web push only works in PWA standalone mode
      if (isIosDevice && !isStandalone) {
        return; 
      }`;

const newCheck = `      // On iOS, web push only works in PWA standalone mode
      if (isIosDevice && !isStandalone) {
        // We will show a special iOS prompt
      }`;

code = code.replace(oldCheck, newCheck);

const uiCode = `  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: 20, x: '-50%' }}
        className="fixed bottom-[100px] left-1/2 w-[calc(100%-2rem)] max-w-md z-[90]"
      >
        <div className="bg-gradient-to-b from-[#1a1a1a]/95 to-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex flex-col gap-5 overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-blue-400/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <h3 className="text-white font-black text-base sm:text-lg tracking-wide">تفعيل التنبيهات</h3>
                <p className="text-zinc-400 text-xs sm:text-sm">
                  {isIosDevice && !isStandalone 
                    ? "لتفعيل التنبيهات على الآيفون، يرجى تثبيت التطبيق أولاً" 
                    : "تنبيه عند تغير الأسعار أو عدم الدخول لأيام"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2" dir="ltr">
              <button 
                onClick={handleSubscribe}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] whitespace-nowrap border border-blue-400/30"
              >
                {isIosDevice && !isStandalone ? "تثبيت" : "تفعيل"}
              </button>
              <button 
                onClick={handleDismiss}
                className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );`;

// Replace the render part
const renderParts = code.split('  return (');
if (renderParts.length === 2) {
  code = renderParts[0] + uiCode;
}

// Add state variables for device detection to render correctly
code = code.replace(
  'const [showPrompt, setShowPrompt] = useState(false);',
  'const [showPrompt, setShowPrompt] = useState(false);\n  const [isIosDevice, setIsIosDevice] = useState(false);\n  const [isStandalone, setIsStandalone] = useState(false);'
);

code = code.replace(
  `      // Check if iOS and not standalone
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;`,
  `      // Check if iOS and not standalone
      const _isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const _isStand = window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      setIsIosDevice(_isIos);
      setIsStandalone(_isStand);`
);

code = code.replace(
  `      // On iOS, web push only works in PWA standalone mode
      if (isIosDevice && !isStandalone) {
        // We will show a special iOS prompt
      }`,
  `      // On iOS, web push only works in PWA standalone mode
      if (_isIos && !_isStand) {
        // We will show a special iOS prompt
      }`
);

code = code.replace(
  `  const handleSubscribe = async () => {`,
  `  const handleSubscribe = async () => {
    if (isIosDevice && !isStandalone) {
      // Show install instructions or trigger install prompt if possible
      alert('الرجاء الضغط على زر المشاركة ثم "الإضافة إلى الشاشة الرئيسية" لتتمكن من تفعيل التنبيهات');
      return;
    }`
);

fs.writeFileSync('src/components/PushNotificationPrompt.tsx', code);
console.log('patched iOS push support');
