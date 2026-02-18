"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { api, authApi } from "@/lib/api";
import {
  saveUser,
  getStoredUser,
  clearAuth,
  getRoleRedirect,
  isAuthenticated,
} from "@/lib/auth";
import { useTelegram } from "./useTelegram";

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const { initData, isReady } = useTelegram();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to restore session on mount
  useEffect(() => {
    if (!isReady) return;

    const storedUser = getStoredUser();
    const token = api.getToken();

    if (storedUser && token) {
      setUser(storedUser);
      setIsLoading(false);
      router.replace(getRoleRedirect(storedUser.role));
    } else {
      setIsLoading(false);
    }
  }, [isReady, router]);

  const login = useCallback(async () => {
    if (!initData) {
      setError(
        "Telegram ma'lumotlari topilmadi. Iltimos, ilovani Telegram orqali oching."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.loginWithTelegram(initData);
      api.setToken(response.access_token);
      saveUser(response.user);
      setUser(response.user);

      // Check if profile is complete
      const needsRegistration = 
        !response.user.first_name || 
        !response.user.last_name || 
        !response.user.phone;

      if (needsRegistration) {
        // Redirect to registration to complete profile
        router.replace("/register");
      } else {
        // Profile complete, go to dashboard
        router.replace(getRoleRedirect(response.user.role));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kirish muvaffaqiyatsiz bo'ldi"
      );
    } finally {
      setIsLoading(false);
    }
  }, [initData, router]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return {
    user,
    isLoading,
    isAuthenticated: isAuthenticated(),
    error,
    login,
    logout,
  };
}
