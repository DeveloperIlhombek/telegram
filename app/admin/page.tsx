"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { LoadingScreen } from "@/components/shared";
import { StatsCard } from "@/components/attendance";
import { useTelegram } from "@/hooks/useTelegram";
import { getStoredUser } from "@/lib/auth";

interface AdminStats {
  total_teachers: number;
  total_students: number;
  total_groups: number;
  today_attendance_rate: number;
}

export default function AdminDashboard() {
  const { user: tgUser } = useTelegram();
  const [storedUser, setStoredUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setStoredUser(getStoredUser());
    adminApi
      .getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingScreen />;

  const displayName =
    storedUser?.first_name || tgUser?.first_name || "Admin";

  const attendanceRate = Math.round(stats?.today_attendance_rate ?? 0);
  const attendanceColor =
    attendanceRate >= 80
      ? "var(--status-present)"
      : attendanceRate >= 60
      ? "var(--status-late)"
      : "var(--status-absent)";

  const today = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="page-enter"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--tg-header-bg)",
          padding: "20px 16px",
          color: "white",
        }}
      >
        <p style={{ fontSize: "13px", opacity: 0.7, margin: "0 0 4px" }}>
          Boshqaruv paneli
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>
          {displayName} 👋
        </h1>
        <p style={{ fontSize: "13px", opacity: 0.8, margin: 0 }}>{today}</p>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Today's attendance highlight */}
        <div
          style={{
            background: "var(--tg-section-bg)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "var(--tg-subtitle)",
              margin: "0 0 8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: 500,
            }}
          >
            Bugungi davomat
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: "48px",
                fontWeight: 700,
                color: attendanceColor,
                lineHeight: 1,
              }}
            >
              {attendanceRate}%
            </span>
            <span style={{ fontSize: "16px", color: "var(--tg-hint)" }}>
              o'rtacha
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: "8px",
              backgroundColor: "var(--tg-secondary-bg)",
              borderRadius: "4px",
              overflow: "hidden",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                width: `${attendanceRate}%`,
                height: "100%",
                backgroundColor: attendanceColor,
                borderRadius: "4px",
                transition: "width 1s ease",
              }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--tg-section-header)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              margin: "0 0 8px 4px",
              fontWeight: 500,
            }}
          >
            Umumiy statistika
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            <StatsCard
              value={stats?.total_teachers ?? 0}
              label="O'qituvchi"
              icon="👨‍🏫"
              color="var(--tg-link)"
            />
            <StatsCard
              value={stats?.total_students ?? 0}
              label="O'quvchi"
              icon="👨‍🎓"
              color="var(--tg-accent)"
            />
            <StatsCard
              value={stats?.total_groups ?? 0}
              label="Guruh"
              icon="📚"
              color="var(--status-late)"
            />
          </div>
        </div>

        {/* Quick links */}
        <div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--tg-section-header)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              margin: "0 0 8px 4px",
              fontWeight: 500,
            }}
          >
            Tez havolalar
          </p>
          <div className="tg-section">
            {[
              { href: "/admin/teachers", icon: "👨‍🏫", label: "O'qituvchilarni boshqarish" },
              { href: "/admin/students", icon: "👨‍🎓", label: "O'quvchilarni boshqarish" },
              { href: "/admin/groups", icon: "📚", label: "Guruhlarni boshqarish" },
            ].map(({ href, icon, label }, index, arr) => (
              <a
                key={href}
                href={href}
                className="tg-list-item"
                style={{
                  textDecoration: "none",
                  borderBottom:
                    index === arr.length - 1
                      ? "none"
                      : "0.5px solid var(--tg-secondary-bg)",
                }}
              >
                <span style={{ fontSize: "22px" }}>{icon}</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "var(--tg-text)",
                  }}
                >
                  {label}
                </span>
                <span style={{ color: "var(--tg-hint)", fontSize: "18px" }}>
                  ›
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
