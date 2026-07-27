import re
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = "  // PWA Install Logic"
replace = """  useEffect(() => {
    const handleInstallPrompt = (e: any) => setIsInstallPromptVisible(e.detail);
    window.addEventListener('installPromptVisibility', handleInstallPrompt);
    return () => window.removeEventListener('installPromptVisibility', handleInstallPrompt);
  }, []);

  // PWA Install Logic"""

content = content.replace(target, replace)
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
