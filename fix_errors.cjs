const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(/res\.status\(500\)\.json\(\{\s*error:\s*"حدث خطأ أثناء حفظ الرسالة",\s*details:\s*error\.message\s*\|\|\s*error\.toString\(\)\s*\}\);/g,
  'res.status(500).json({ error: "حدث خطأ أثناء حفظ الرسالة" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*error:\s*err\.message\s*\}\);/g,
  'res.status(500).json({ error: "حدث خطأ في الخادم" });');
  
c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*message:\s*err\.message\s*\|\|\s*"فشل إرسال الكود"\s*\}\);/g,
  'res.status(500).json({ success: false, message: "فشل إرسال الكود" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*message:\s*err\.message\s*\|\|\s*"فشل التحقق من الكود"\s*\}\);/g,
  'res.status(500).json({ success: false, message: "فشل التحقق من الكود" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*message:\s*err\.message\s*\}\);/g,
  'res.status(500).json({ success: false, message: "حدث خطأ في الخادم" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*message:\s*`خطأ في جلب البيانات: \$\{err\.message \|\| 'فشل العملية'\}?\s*`\s*\}\);/g,
  'res.status(500).json({ success: false, message: "حدث خطأ في جلب البيانات" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*message:\s*`خطأ في الاستخراج: \$\{err\.message \|\| 'فشل العملية'\}?\s*`\s*\}\);/g,
  'res.status(500).json({ success: false, message: "حدث خطأ في الاستخراج" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*error\.message\s*\|\|\s*"Failed to fetch messages"\s*\}\);/g,
  'res.status(500).json({ success: false, error: "Failed to fetch messages" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*err\.message\s*\|\|\s*"Failed to broadcast official rates"\s*\}\);/g,
  'res.status(500).json({ success: false, error: "Failed to broadcast official rates" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*err\.message\s*\|\|\s*"Failed to broadcast"\s*\}\);/g,
  'res.status(500).json({ success: false, error: "Failed to broadcast" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*err\.message\s*\|\|\s*"Failed to broadcast to Facebook"\s*\}\);/g,
  'res.status(500).json({ success: false, error: "Failed to broadcast to Facebook" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*err\.message\s*\|\|\s*"Failed to generate analysis"\s*\}\);/g,
  'res.status(500).json({ success: false, error: "Failed to generate analysis" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*error\.message\s*\|\|\s*"Failed to send message"\s*\}\);/g,
  'res.status(500).json({ success: false, error: "Failed to send message" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*error\.message\s*\|\|\s*"Failed to update from channel"\s*\}\);/g,
  'res.status(500).json({ success: false, error: "Failed to update from channel" });');

c = c.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*err\.message\s*\}\);/g,
  'res.status(500).json({ success: false, error: "حدث خطأ في الخادم" });');

fs.writeFileSync('server.ts', c);
