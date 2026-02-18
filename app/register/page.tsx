"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { api, authApi } from "@/lib/api";
import { saveUser, getRoleRedirect } from "@/lib/auth";
import { haptic, showMainButton, hideMainButton } from "@/lib/telegram";

interface RegistrationData {
  first_name: string;
  last_name: string;
  username: string;
  phone: string;
}

const STEPS = [
  { key: "first_name", label: "Ismingiz", placeholder: "Jasur", emoji: "👤", required: true },
  { key: "last_name", label: "Familiyangiz", placeholder: "Karimov", emoji: "👨", required: true },
  { key: "username", label: "Username", placeholder: "@jasurk", emoji: "🏷️", required: false },
  { key: "phone", label: "Telefon raqam", placeholder: "+998 90 123 45 67", emoji: "📱", required: true },
];

export default function RegisterPage() {
  const router = useRouter();
  const { initData, user: tgUser } = useTelegram();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<RegistrationData>({
    first_name: "",
    last_name: "",
    username: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);
  const currentField = STEPS[currentStep];


  useEffect(() => {
    if (tgUser) {
      setData({
        first_name: tgUser.first_name || "",
        last_name: tgUser.last_name || "",
        username: tgUser.username || "",
        phone: "",
      });
    }
  }, [tgUser]);

  // Telegram MainButton
  useEffect(() => {
    const buttonText = currentStep < STEPS.length - 1 ? "Keyingi →" : "✅ Tugatish";
    const handler = currentStep < STEPS.length - 1 ? handleNext : handleSubmit;
    showMainButton(buttonText, handler);
    return () => hideMainButton(handler);
  }, [currentStep, data]);

  const handleNext = () => {
    const currentValue = data[currentField.key as keyof RegistrationData];
    if (currentField.required && !currentValue.trim()) {
      haptic.error();
      setError(`${currentField.label} kiritilishi shart!`);
      return;
    }
    haptic.light();
    setError("");
    setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async () => {
    if (!data.first_name || !data.last_name || !data.phone) {
      haptic.error();
      setError("Majburiy maydonlarni to'ldiring!");
      return;
    }
    if (!initData) {
      setError("Telegram ma'lumotlari topilmadi");
      return;
    }

    setIsSubmitting(true);
    setError("");
    haptic.medium();

    try {
      const authResponse = await authApi.loginWithTelegram(initData);
      api.setToken(authResponse.access_token);

      // Update profile on backend
      await api.put("/auth/me", {
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username || undefined,
        phone: data.phone,
      });

      // Save updated user locally
      const updatedUser = {
        ...authResponse.user,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username || authResponse.user.first_name,
        phone: data.phone,
      };
      saveUser(updatedUser);
      haptic.success();
      router.replace(getRoleRedirect(authResponse.user.role));
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      haptic.light();
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--tg-bg)" }}>
      {/* Progress */}
      <div style={{ height: "4px", background: "var(--tg-secondary-bg)" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: "linear-gradient(90deg, var(--tg-button), var(--tg-accent))",
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>

      {/* Header */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "0.5px solid color-mix(in srgb, var(--tg-hint) 15%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          {currentStep > 0 && (
            <button onClick={handleBack} style={{
              background: "var(--tg-secondary-bg)", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "16px", color: "var(--tg-link)",
            }}>‹</button>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--tg-text)", margin: 0 }}>
              Ro'yxatdan o'tish
            </h1>
            <p style={{ fontSize: "13px", color: "var(--tg-subtitle)", margin: "2px 0 0" }}>
              Qadam {currentStep + 1} / {STEPS.length} • {progress}%
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div key={currentStep} style={{ width: "100%", maxWidth: "400px", animation: "slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>
          <div style={{ fontSize: "72px", textAlign: "center", marginBottom: "24px", animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
            {currentField.emoji}
          </div>

          <label style={{ display: "block", fontSize: "15px", fontWeight: 600, color: "var(--tg-text)", marginBottom: "8px" }}>
            {currentField.label} {currentField.required && <span style={{ color: "var(--status-absent)" }}>*</span>}
          </label>

          <input
            type={currentField.key === "phone" ? "tel" : "text"}
            value={data[currentField.key as keyof RegistrationData]}
            onChange={(e) => { setData({ ...data, [currentField.key]: e.target.value }); setError(""); }}
            placeholder={currentField.placeholder}
            autoFocus
            disabled={isSubmitting}
            style={{
              width: "100%", padding: "16px", fontSize: "17px",
              border: `2px solid ${error ? "var(--status-absent)" : "var(--tg-button)"}`,
              borderRadius: "16px", background: "var(--tg-secondary-bg)",
              color: "var(--tg-text)", outline: "none", transition: "all 0.2s ease", fontWeight: 500,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (currentStep < STEPS.length - 1) handleNext();
                else handleSubmit();
              }
            }}
          />

          {!error && (
            <p style={{ fontSize: "13px", color: "var(--tg-subtitle)", marginTop: "8px", textAlign: "center" }}>
              {currentField.key === "username" && "(Ixtiyoriy) Username'siz davom etishingiz mumkin"}
              {currentField.key === "phone" && "Telefon raqamingizni kiriting"}
              {currentField.key === "first_name" && "To'liq ismingizni kiriting"}
              {currentField.key === "last_name" && "Familiyangizni kiriting"}
            </p>
          )}

          {error && (
            <div style={{
              marginTop: "12px", padding: "12px 16px",
              background: "color-mix(in srgb, var(--status-absent) 10%, transparent)",
              border: "1px solid var(--status-absent)", borderRadius: "12px",
              fontSize: "13px", color: "var(--status-absent)", textAlign: "center",
              animation: "shake 0.4s",
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      {/* Dots */}
      <div style={{ padding: "16px", display: "flex", justifyContent: "center", gap: "8px" }}>
        {STEPS.map((_, index) => (
          <div key={index} style={{
            width: index === currentStep ? "24px" : "8px", height: "8px", borderRadius: "4px",
            background: index <= currentStep ? "var(--tg-button)" : "var(--tg-secondary-bg)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        ))}
      </div>

      {isSubmitting && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)", zIndex: 1000,
        }}>
          <div style={{
            background: "var(--tg-section-bg)", borderRadius: "20px", padding: "24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
          }}>
            <div style={{
              width: 40, height: 40, border: "4px solid var(--tg-secondary-bg)",
              borderTopColor: "var(--tg-button)", borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ fontSize: "15px", color: "var(--tg-text)", margin: 0 }}>Saqlanmoqda...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
