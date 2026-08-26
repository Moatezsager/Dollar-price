import re

with open('src/Admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Revert my bad replace if it happened:
content = content.replace("import { Monitor, Smartphone, Layout, Wifi, Clock, Chrome, Compass, AppWindow,  motion, AnimatePresence } from \"motion/react\";", "import { motion, AnimatePresence } from \"motion/react\";")

# Properly add imports to lucide-react
lucide_import_pattern = r'import\s*{\s*([^}]+)\s*}\s*from\s*[\'"]lucide-react[\'"];?'
match = re.search(lucide_import_pattern, content)
if match:
    existing_imports = match.group(1)
    new_icons = ["Monitor", "Smartphone", "Layout", "Wifi", "Clock", "AppWindow"]
    
    current_icons = [x.strip() for x in existing_imports.split(',')]
    for icon in new_icons:
        if icon not in current_icons:
            current_icons.append(icon)
            
    new_import = "import { " + ", ".join(current_icons) + " } from 'lucide-react';"
    content = content.replace(match.group(0), new_import)

with open('src/Admin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed imports in Admin.tsx")
