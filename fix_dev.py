import re

with open('src/Developers.tsx', 'r') as f:
    content = f.read()

# Fix the invalid insertion
content = content.replace('''      className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-12"
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors -mb-4"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>
      )}
    >''', '''      className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-12"
    >
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>
      )}''')

with open('src/Developers.tsx', 'w') as f:
    f.write(content)

