const fs = require('fs');
let code = fs.readFileSync('src/components/TelegramPoster.tsx', 'utf8');

const targetStr = `        <button
          onClick={handleSend}
          disabled={isSending || !channel || !message}
          className="w-full py-3 px-4 bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>إرسال الآن</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>`;

const replaceStr = `        <button
          onClick={handleSend}
          disabled={isSending || !channel || !message}
          className="w-full py-3 px-4 bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>إرسال الآن</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
        <button
          onClick={async () => {
            if (!channel) {
              setError('يرجى تحديد القناة');
              return;
            }
            setError(null);
            setSuccess(null);
            try {
              const response = await fetch('/api/admin/telegram/official-broadcast', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ channel })
              });
              const data = await response.json();
              if (response.ok && data.success) {
                setSuccess('تم إرسال أسعار المصرف المركزي بنجاح!');
              } else {
                setError(data.error || 'حدث خطأ أثناء إرسال أسعار المصرف المركزي');
              }
            } catch (err: any) {
              setError(err.message || 'حدث خطأ في الاتصال بالخادم');
            }
          }}
          className="w-full py-3 px-4 bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg mt-3"
        >
          <span>نشر أسعار المركزي</span>
          <Send className="w-4 h-4" />
        </button>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/TelegramPoster.tsx', code);
console.log('patched TelegramPoster.tsx');
