"use client";

import { useEffect, useState } from "react";
import { getTelegramWebApp, applyTelegramTheme } from "@/lib/telegram";
import { TelegramWebApp, TelegramUser } from "@/lib/types";

interface UseTelegramReturn {
  tg: TelegramWebApp | null;
  user: TelegramUser | null;
  initData: string;
  colorScheme: "light" | "dark";
  isReady: boolean;
  isTMA: boolean;
}

export function useTelegram(): UseTelegramReturn {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const webApp = getTelegramWebApp();

    if (webApp) {
      webApp.ready();
      webApp.expand();
      applyTelegramTheme();
      setTg(webApp);
    }

    setIsReady(true);
  }, []);

  return {
    tg,
    user: tg?.initDataUnsafe?.user ?? null,
    initData: tg?.initData ?? "",
    colorScheme: tg?.colorScheme ?? "light",
    isReady,
    isTMA: !!tg?.initData,
  };
}
