"use dom";

import { useEffect, useState } from "react";
import { domFetch, configureDomApi } from "./dom-api";
import { getDomT } from "./dom-i18n";
import "./globals.css";

interface ProfileDomProps {
  apiUrl?: string;
  token?: string | null;
  locale?: string;
  onLogout?: () => void;
}

export default function ProfileDom({ apiUrl, token, locale = "en", onLogout }: ProfileDomProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const t = getDomT(locale);

  if (apiUrl || token) configureDomApi({ apiUrl, token });

  useEffect(() => {
    domFetch<any>("/users/me")
      .then((data) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">{t("athlete.dashboard.trainer")}</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : user ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold text-xl">
                    {user.email?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="font-medium text-gray-900">{user.email}</div>
                <div className="text-sm text-gray-500 capitalize mt-1">{user.role}</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900">{user.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Role</span>
                  <span className="text-gray-900 capitalize">{user.role}</span>
                </div>
                {user.profile?.firstName && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Name</span>
                    <span className="text-gray-900">
                      {user.profile.firstName} {user.profile.lastName || ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button onClick={onLogout}
              className="w-full bg-red-50 text-red-600 py-2.5 rounded-md text-sm font-medium hover:bg-red-100">
              Logout
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Unable to load profile</div>
        )}
      </div>
    </div>
  );
}
