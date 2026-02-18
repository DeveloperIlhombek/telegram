import { TelegramWebApp } from "./types";

// ============================================
// Telegram WebApp Instance
// ============================================
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram?.WebApp ?? null;
}

export function isTelegramWebApp(): boolean {
  const tg = getTelegramWebApp();
  return !!tg?.initData;
}

// ============================================
// Theme helpers - maps TG theme to CSS vars
// ============================================
export function applyTelegramTheme(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;

  const { themeParams, colorScheme } = tg;
  const root = document.documentElement;

  // Apply Telegram theme CSS variables
  const mappings: Record<string, string | undefined> = {
    "--tg-bg": themeParams.bg_color,
    "--tg-text": themeParams.text_color,
    "--tg-hint": themeParams.hint_color,
    "--tg-link": themeParams.link_color,
    "--tg-button": themeParams.button_color,
    "--tg-button-text": themeParams.button_text_color,
    "--tg-secondary-bg": themeParams.secondary_bg_color,
    "--tg-header-bg": themeParams.header_bg_color,
    "--tg-bottom-bar-bg": themeParams.bottom_bar_bg_color,
    "--tg-accent": themeParams.accent_text_color,
    "--tg-section-bg": themeParams.section_bg_color,
    "--tg-section-header": themeParams.section_header_text_color,
    "--tg-subtitle": themeParams.subtitle_text_color,
    "--tg-destructive": themeParams.destructive_text_color,
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (value) root.style.setProperty(key, value);
  }

  root.setAttribute("data-tg-theme", colorScheme);
}

// ============================================
// Haptic Feedback shortcuts
// ============================================
export const haptic = {
  light: () => getTelegramWebApp()?.HapticFeedback.impactOccurred("light"),
  medium: () => getTelegramWebApp()?.HapticFeedback.impactOccurred("medium"),
  heavy: () => getTelegramWebApp()?.HapticFeedback.impactOccurred("heavy"),
  success: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred("success"),
  error: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred("error"),
  warning: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred("warning"),
  select: () => getTelegramWebApp()?.HapticFeedback.selectionChanged(),
};

// ============================================
// Alert / Confirm helpers
// ============================================
export function tgAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.showAlert(message, resolve);
    } else {
      alert(message);
      resolve();
    }
  });
}

export function tgConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.showConfirm(message, resolve);
    } else {
      resolve(window.confirm(message));
    }
  });
}

// ============================================
// Main Button helpers
// ============================================
export function showMainButton(text: string, onClick: () => void): void {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.MainButton.setText(text);
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();
  tg.MainButton.enable();
}

export function hideMainButton(onClick?: () => void): void {
  const tg = getTelegramWebApp();
  if (!tg) return;
  if (onClick) tg.MainButton.offClick(onClick);
  tg.MainButton.hide();
}

// ============================================
// Utils
// ============================================
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function getFullName(
  user: { first_name: string; last_name?: string } | undefined
): string {
  if (!user) return "Noma'lum";
  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}
