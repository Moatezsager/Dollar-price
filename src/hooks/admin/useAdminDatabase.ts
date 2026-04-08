import { useState, useEffect } from 'react';

export function useAdminDatabase(token: string) {
  const [dbMarket, setDbMarket] = useState<'parallel' | 'official'>('parallel');
  const [dbCurrency, setDbCurrency] = useState<string>('USD');
  const [dbRecords, setDbRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDbRecords = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/records/${dbMarket}/${dbCurrency}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDbRecords(data.records);
      } else {
        setError(data.message || "فشل جلب السجلات");
      }
    } catch (err) {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = async (id: string, value: string) => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/admin/records/${dbMarket}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currency: dbCurrency, value })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم تحديث السجل بنجاح");
        fetchDbRecords();
        return true;
      } else {
        setError(data.message || "فشل التحديث");
        return false;
      }
    } catch (err) {
      setError("خطأ في الاتصال");
      return false;
    }
  };

  const deleteRecord = async (id: string) => {
    if (!token || !confirm("هل أنت متأكد من حذف هذا السجل؟")) return false;
    try {
      const res = await fetch(`/api/admin/records/${dbMarket}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم حذف السجل بنجاح");
        fetchDbRecords();
        return true;
      } else {
        setError(data.message || "فشل الحذف");
        return false;
      }
    } catch (err) {
      setError("خطأ في الاتصال");
      return false;
    }
  };

  useEffect(() => {
    if (token) {
      fetchDbRecords();
    }
  }, [dbMarket, dbCurrency, token]);

  return {
    dbMarket,
    setDbMarket,
    dbCurrency,
    setDbCurrency,
    dbRecords,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchDbRecords,
    updateRecord,
    deleteRecord
  };
}
