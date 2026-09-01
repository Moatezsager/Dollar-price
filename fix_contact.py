import re

with open('src/Contact.tsx', 'r') as f:
    content = f.read()

# Add ArrowRight to import
content = content.replace("CheckCircle2, AlertCircle } from 'lucide-react'", "CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'")

# Update component signature
content = content.replace("export const Contact = () => {", "export const Contact = ({ onBack }: { onBack?: () => void }) => {")

# Insert Back Button
content = content.replace('''      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-8"
    >
      <div className="text-center space-y-4">''', '''      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-8"
    >
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>
      )}
      <div className="text-center space-y-4">''')

with open('src/Contact.tsx', 'w') as f:
    f.write(content)

