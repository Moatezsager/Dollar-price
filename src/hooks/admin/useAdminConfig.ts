import { useState, useEffect } from 'react';
import { logErrorToServer } from '../../utils/logger';

export function useAdminConfig(token: string) {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchConfig = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        setError("فشل تحميل الإعدادات");
      }
    } catch (err) {
      logErrorToServer(err, "useAdminConfig: fetchConfig");
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: any = config) => {
    if (!token || !newConfig) return false;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم حفظ الإعدادات بنجاح!");
        setConfig(newConfig);
        return true;
      } else {
        setError(data.message || "فشل الحفظ");
        return false;
      }
    } catch (err) {
      setError("خطأ في عملية الحفظ");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConfig();
    }
  }, [token]);

  return {
    config,
    setConfig,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchConfig,
    saveConfig
  };
}
