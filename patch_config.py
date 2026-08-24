import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """      appConfig = newConfig;
      const saved = await saveConfigToSupabase(appConfig);
      if (!saved) {
        return res.status(500).json({ success: false, message: "تم تحديث السيرفر، لكن فشل الحفظ في قاعدة البيانات" });
      }
      
      const parallelTally = await fetchParallelRatesFromTelegram();"""

new_block = """      appConfig = newConfig;
      const saved = await saveConfigToSupabase(appConfig);
      
      const parallelTally = await fetchParallelRatesFromTelegram();"""

content = content.replace(old_block, new_block)

old_block_res = """      broadcastConfigUpdate();
      res.json({ success: true, message: "تم حفظ الإعدادات بنجاح" });
    } catch (err) {"""

new_block_res = """      broadcastConfigUpdate();
      res.json({ success: true, message: saved ? "تم حفظ الإعدادات بنجاح" : "تم حفظ الإعدادات وتطبيقها بنجاح (وضع الذاكرة المؤقتة)" });
    } catch (err) {"""

content = content.replace(old_block_res, new_block_res)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched config save API!")
