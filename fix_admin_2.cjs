const fs = require('fs');
let code = fs.readFileSync('src/Admin.tsx', 'utf8');

code = code.replace(
  /const \[userLogs, setUserLogs\] = useState<any\[\]>\(\[\]\);/g,
  "const [userLogs, setUserLogs] = useState<any[]>([]);\n  const [analyticsData, setAnalyticsData] = useState<any>(null);\n  const [analyticsDays, setAnalyticsDays] = useState(7);"
);

code = code.replace(
  /const fetchTrackingLogs = async \(\) => {/g,
  `const fetchAnalyticsDashboard = async () => {
    try {
      const res = await fetch(\`/api/admin/analytics?days=\${analyticsDays}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.warn("Analytics fetch failed", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'tracking' && token) {
      fetchAnalyticsDashboard();
    }
  }, [analyticsDays, token, activeTab]);

  const fetchTrackingLogs = async () => {
    fetchAnalyticsDashboard();`
);

fs.writeFileSync('src/Admin.tsx', code, 'utf8');
console.log("Fixed Admin.tsx variables.");
