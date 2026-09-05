const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const shareStatesAndFn = `
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
  const [shareData, setShareData] = useState<any>(null);

  const handleShareCardImage = async (code: string, name: string, price: number, isGold = false) => {
    setIsGeneratingShareImage(true);
    triggerHaptic(10);
    try {
      // Calculate stats for the last 24h
      const now = new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const values = history
        .filter(h => new Date(h.time) >= cutoff)
        .map(h => {
          if (isGold) return h.ratesParallel?.[code] || h.rates?.gold?.karat18 || 0;
          if (code === 'USD_CASH') return h.usdParallel || h.ratesParallel?.USD || 0;
          if (code === 'USD_CHECKS') return h.ratesParallel?.USD_CHECKS || h.ratesParallel?.USD_JBANK || h.ratesParallel?.USD_NCB || 0;
          return h.ratesParallel?.[code] || 0;
        })
        .filter(v => v > 0);

      const max = values.length > 0 ? Math.max(...values) : price;
      const min = values.length > 0 ? Math.min(...values) : price;
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : price;
      const trend = price >= (values[0] || price) ? 'up' : 'down';

      setShareData({ code, name, price, max, min, avg, trend, isGold });

      // Wait a tick for the hidden component to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const node = document.getElementById('share-card-node');
      if (node) {
        const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 3, quality: 1 });
        
        // Try web share first
        if (navigator.share) {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], 'share.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'مؤشر الدينار',
              text: \`سعر \${name} الآن: \${price.toFixed(2)} د.ل\`,
              files: [file]
            });
            setIsGeneratingShareImage(false);
            setShareData(null);
            return;
          }
        }
        
        // Fallback to download
        const link = document.createElement('a');
        link.download = \`dinar-index-\${code}.png\`;
        link.href = dataUrl;
        link.click();
        addToast('تم الحفظ', 'تم حفظ صورة السعر بنجاح', 'info');
      }
    } catch (err) {
      console.error(err);
      addToast('خطأ', 'فشل إنشاء الصورة للمشاركة', 'down');
    }
    setIsGeneratingShareImage(false);
    setShareData(null);
  };
`;

const hiddenNode = `
        {/* Hidden Share Card */}
        {shareData && (
          <div className="fixed -left-[9999px] top-0">
            <div id="share-card-node" className="w-[500px] h-[600px] bg-[#050505] p-8 flex flex-col relative overflow-hidden" dir="rtl" style={{ fontFamily: 'Cairo, sans-serif' }}>
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-8 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shrink-0">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">مؤشر الدينار</h1>
                    <p className="text-sm text-zinc-400">dollar-price-qp14.onrender.com</p>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-zinc-400">{format(new Date(), "yyyy-MM-dd", { locale: ar })}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-1">{format(new Date(), "HH:mm")}</div>
                </div>
              </div>

              {/* Main Price */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-6 flex flex-col items-center justify-center relative z-10 backdrop-blur-xl">
                <span className="text-lg text-zinc-400 font-bold mb-4">{shareData.name}</span>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-6xl font-black text-white font-mono tracking-tighter">{shareData.price.toFixed(2)}</span>
                  <span className="text-xl text-zinc-500 font-bold mt-4">د.ل</span>
                </div>
                <div className={\`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 \${shareData.trend === 'up' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}\`}>
                  {shareData.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {shareData.trend === 'up' ? 'مرتفع' : 'منخفض'}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 z-10">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-xs text-zinc-500 mb-1 font-bold">أعلى سعر (24س)</span>
                  <span className="text-lg text-white font-mono font-bold">{shareData.max.toFixed(2)}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-xs text-emerald-400 mb-1 font-bold">متوسط السعر</span>
                  <span className="text-xl text-emerald-400 font-mono font-black">{shareData.avg.toFixed(2)}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-xs text-zinc-500 mb-1 font-bold">أقل سعر (24س)</span>
                  <span className="text-lg text-white font-mono font-bold">{shareData.min.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-6 left-0 right-0 text-center z-10">
                <p className="text-xs text-zinc-600 font-bold tracking-wide">المنصة الأولى لأسعار العملات والذهب في ليبيا</p>
              </div>
            </div>
          </div>
        )}
`;

if (!app.includes('handleShareCardImage')) {
  app = app.replace("  return (\n    <MotionConfig", shareStatesAndFn + "\n  return (\n    <MotionConfig");
}

if (!app.includes('share-card-node')) {
  app = app.replace("<InstallPrompt />", "<InstallPrompt />\n" + hiddenNode);
}

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Added share image logic');
