import React, { useState } from "react";
import { AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";

// Hooks
import { useAdminAuth } from "./hooks/admin/useAdminAuth";
import { useAdminData } from "./hooks/admin/useAdminData";
import { useAdminConfig } from "./hooks/admin/useAdminConfig";
import { useAdminDatabase } from "./hooks/admin/useAdminDatabase";

// Components
import { AdminLayout } from "./components/Admin/AdminLayout";
import { LoginView } from "./components/Admin/LoginView";
import { DashboardTab } from "./components/Admin/DashboardTab";
import { ConfigTab } from "./components/Admin/ConfigTab";
import { DatabaseTab } from "./components/Admin/DatabaseTab";
import { LogsTab } from "./components/Admin/LogsTab";
import { ChangesTab } from "./components/Admin/ChangesTab";
import { TelegramTab } from "./components/Admin/TelegramTab";
import { AITab } from "./components/Admin/AITab";

export default function Admin() {
  const { token, isLoggedIn, login, logout, error: authError, loading: authLoading } = useAdminAuth();
  const { 
    stats, logs, recentChanges, apiStatsData, liveFeed, loading: dataLoading, 
    connectionStatus, fetchAll, fetchStats, fetchLogs, fetchRecentChanges, 
    fetchApiStats, fetchLiveFeed 
  } = useAdminData(token);
  const { 
    config, setConfig, saveConfig, loading: configLoading, error: configError, 
    success: configSuccess 
  } = useAdminConfig(token);
  const { 
    dbMarket, setDbMarket, dbCurrency, setDbCurrency, dbRecords, loading: dbLoading, 
    fetchDbRecords, updateRecord, deleteRecord 
  } = useAdminDatabase(token);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'stats' | 'logs' | 'ai' | 'changes' | 'telegram' | 'tools' | 'api' | 'database'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tools & Actions
  const runDiagnostics = async () => {
    // Implement or fetch from API
  };

  const clearRam = async () => {
    try {
      await fetch("/api/admin/clear-ram", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      fetchAll();
    } catch (e) {}
  };

  const handleTelegramSendCode = async (phone: string, apiId: string, apiHash: string) => {
    try {
      const res = await fetch("/api/admin/telegram/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phoneNumber: phone, apiId, apiHash })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: "خطأ في الاتصال" };
    }
  };

  const handleTelegramVerify = async (code: string, password?: string) => {
    // This requires more state (phoneCodeHash etc stored in hook or state)
    // For now, let's keep it simple or implement fully if needed.
    return false;
  };

  const handleAIExtract = async (text: string) => {
     try {
       const res = await fetch("/api/admin/extract", {
         method: "POST",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify({ text })
       });
       return await res.json();
     } catch (e) {
       return { success: false, message: "خطأ في الاتصال" };
     }
  };

  const handleAISave = async (updates: any) => {
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (data.success) {
        fetchAll();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch("/api/admin/error-logs", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchLogs();
    } catch (e) {}
  };

  const handleClearChanges = async () => {
    try {
      await fetch("/api/admin/recent-changes", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchRecentChanges();
    } catch (e) {}
  };

  if (!isLoggedIn) {
    return <LoginView login={login} loading={authLoading} error={authError} />;
  }

  if (!config && activeTab !== 'dashboard') {
     return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">جاري تحميل البيانات...</p>
          </div>
        </div>
      );
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      logout={logout}
      stats={stats}
      connectionStatus={connectionStatus}
      onSave={() => saveConfig()}
      saveLoading={configLoading}
      minutesSinceLastScrape={stats?.minutesSinceLastScrape || null}
      onlineUsers={stats?.onlineUsers || 0}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            stats={stats}
            recentChanges={recentChanges}
            logs={logs}
            config={config}
            onNavigate={setActiveTab}
            runDiagnostics={runDiagnostics}
            clearRam={clearRam}
          />
        )}
        {activeTab === 'config' && (
          <ConfigTab 
            config={config}
            setConfig={setConfig}
            onSave={saveConfig}
            loading={configLoading}
          />
        )}
        {activeTab === 'database' && (
          <DatabaseTab 
            market={dbMarket}
            setMarket={setDbMarket}
            currency={dbCurrency}
            setCurrency={setDbCurrency}
            records={dbRecords}
            loading={dbLoading}
            onRefresh={fetchDbRecords}
            onUpdate={updateRecord}
            onDelete={deleteRecord}
            configTerms={config?.terms || []}
          />
        )}
        {activeTab === 'logs' && (
          <LogsTab 
            logs={logs}
            onRefresh={fetchLogs}
            onClear={handleClearLogs}
            loading={dataLoading}
          />
        )}
        {activeTab === 'changes' && (
          <ChangesTab 
            recentChanges={recentChanges}
            onClear={handleClearChanges}
            loading={dataLoading}
          />
        )}
        {activeTab === 'telegram' && (
          <TelegramTab 
            config={config}
            onSendCode={handleTelegramSendCode}
            onVerifyCode={handleTelegramVerify}
            loading={dataLoading}
          />
        )}
        {activeTab === 'ai' && (
          <AITab 
            onExtract={handleAIExtract}
            onSave={handleAISave}
            loading={dataLoading}
            currentRates={stats?.dbStats || {}} // Needs actual current rates
          />
        )}
        {/* Placeholder for remaining tabs */}
        {!['dashboard', 'config', 'database', 'logs', 'changes', 'telegram', 'ai'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-600 gap-4">
            <div className="text-5xl opacity-20">🚧</div>
            <p className="text-xl font-bold">قيد التطوير والتحسين</p>
            <p className="text-sm">يتم العمل حالياً على إعادة هيكلة قسم: {activeTab}</p>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
