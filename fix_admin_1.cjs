const fs = require('fs');
let code = fs.readFileSync('src/Admin.tsx', 'utf8');

const importTarget = `import { io } from "socket.io-client";`;
const importReplacement = `import { io } from "socket.io-client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";`;

if (code.includes(importTarget) && !code.includes('recharts')) {
    code = code.replace(importTarget, importReplacement);
}

const stateTarget = `  const [userLogs, setUserLogs] = useState<any[]>([]);`;
const stateReplacement = `  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);`;

if (code.includes(stateTarget) && !code.includes('analyticsData')) {
    code = code.replace(stateTarget, stateReplacement);
}

const fetchTarget = `  const fetchTrackingLogs = async () => {`;
const fetchReplacement = `  const fetchAnalyticsDashboard = async () => {
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
    fetchAnalyticsDashboard();`;

if (code.includes(fetchTarget) && !code.includes('fetchAnalyticsDashboard')) {
    code = code.replace(fetchTarget, fetchReplacement);
}

fs.writeFileSync('src/Admin.tsx', code, 'utf8');
console.log("Fixed Admin.tsx missing definitions.");
