"use dom";

import { useState } from "react";
import { domFetch, configureDomApi } from "./dom-api";
import { getDomT } from "./dom-i18n";
import "./globals.css";

interface LoginDomProps {
  apiUrl?: string;
  locale?: string;
  onLoginSuccess?: (data: { accessToken: string; refreshToken: string; user: any }) => void;
}

export default function LoginDom({ apiUrl, locale = "en", onLoginSuccess }: LoginDomProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = getDomT(locale);

  if (apiUrl) configureDomApi({ apiUrl });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await domFetch<{ accessToken: string; refreshToken: string; user: any }>(
        "/auth/login",
        { method: "POST", body: { email, password } }
      );
      onLoginSuccess?.(data);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-1">{t("auth.login.title")}</h1>
          <p className="text-gray-400 text-center mb-6 text-sm">GymTrack</p>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.login.email")}
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.login.password")}
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "..." : t("auth.login.submit")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("auth.login.no_account")}{" "}
            <a href="/(auth)/register" className="text-blue-600 hover:underline font-medium">
              {t("auth.login.register_link")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

