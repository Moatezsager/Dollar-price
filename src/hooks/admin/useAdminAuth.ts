import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("adminToken") || "";
    } catch (e) { return ""; }
  });
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (password: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        try {
          localStorage.setItem("adminToken", data.token);
          localStorage.setItem("admin_device_token", "authorized_device_token_xyz");
        } catch (e) {}
        setIsLoggedIn(true);
        return true;
      } else {
        setError(data.message);
        return false;
      }
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try { localStorage.removeItem("adminToken"); } catch (e) {}
    setToken("");
    setIsLoggedIn(false);
  };

  return {
    token,
    isLoggedIn,
    loading,
    error,
    login,
    logout,
    setIsLoggedIn,
    setToken
  };
}
