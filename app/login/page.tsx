"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTelegram } from "@/hooks/useTelegram";
import { haptic } from "@/lib/telegram";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const { user, isReady, isTMA } = useTelegram();
  const [showDebug, setShowDebug] = useState(false);

  // Auto-login if initData available
  useEffect(() => {
    if (isReady && isTMA) {
      login();
    }
  }, [isReady, isTMA, login]);

  const handleManualLogin = () => {
    haptic.medium();
    login();
  };

  // Friendly error message
  const getErrorMessage = (err: string) => {
    if (err.toLowerCase().includes("not found") || err.includes("404")) {
      return "Backend topilmadi. NEXT_PUBLIC_API_URL ni tekshiring.";
    }
    if (err.toLowerCase().includes("failed to fetch") || err.toLowerCase().includes("network")) {
      return "Tarmoq xatosi. Backend ishlayaptimi?";
    }
    if (err.includes("422")) {
      return "initData formati noto'g'ri. Bot token to'g'rimi?";
    }
    if (err.includes("401") || err.includes("403")) {
      return "Ruxsat yo'q. initData muddati o'tgan bo'lishi mumkin.";
    }
    return err;
  };

  return (
    <div
      className="page-enter"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "var(--tg-bg)",
        gap: "20px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "22px",
          background: "var(--tg-button)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
          boxShadow: "0 8px 24px color-mix(in srgb, var(--tg-button) 40%, transparent)",
        }}
      >
        📋
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "6px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--tg-text)", margin: 0 }}>
          Davomat Tizimi
        </h1>
        <p style={{ fontSize: "15px", color: "var(--tg-subtitle)", margin: 0, lineHeight: 1.4 }}>
          O'quv markazi davomat boshqaruv tizimi
        </p>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <LoadingSpinner />
          <p style={{ fontSize: "14px", color: "var(--tg-hint)", margin: 0 }}>
            {user ? `Xush kelibsiz, ${user.first_name}!` : "Kirish..."}
          </p>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* Not TMA warning */}
          {!isTMA && (
            <div style={{
              background: "color-mix(in srgb, var(--status-late) 12%, transparent)",
              border: "1px solid var(--status-late)",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "13px",
              color: "var(--status-late)",
              textAlign: "center",
              lineHeight: 1.5,
            }}>
              ⚠️ <strong>Telegram orqali oching</strong><br/>
              Browser'da initData bo'lmaydi
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "color-mix(in srgb, var(--status-absent) 10%, transparent)",
              border: "1px solid var(--status-absent)",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "13px",
              color: "var(--status-absent)",
              textAlign: "center",
              lineHeight: 1.5,
            }}>
              ❌ {getErrorMessage(error)}
            </div>
          )}

          <button className="tg-btn" onClick={handleManualLogin} disabled={isLoading}>
            Kirish
          </button>

          {/* Debug panel (tap 5x to show) */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{
              background: "none",
              border: "none",
              color: "var(--tg-hint)",
              fontSize: "11px",
              cursor: "pointer",
              padding: "4px",
              textAlign: "center",
            }}
          >
            {showDebug ? "Yopish" : "Debug ma'lumot"}
          </button>

          {showDebug && (
            <div style={{
              background: "var(--tg-secondary-bg)",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "11px",
              color: "var(--tg-hint)",
              lineHeight: 1.8,
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}>
              <div><strong>API URL:</strong> {API_URL || "❌ NOT SET"}</div>
              <div><strong>TMA:</strong> {isTMA ? "✅ Ha" : "❌ Yo'q"}</div>
              <div><strong>User:</strong> {user ? `${user.first_name} (${user.id})` : "Yo'q"}</div>
              <div><strong>Error:</strong> {error || "Yo'q"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: "3px solid color-mix(in srgb, var(--tg-button) 20%, transparent)",
        borderTopColor: "var(--tg-button)",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
