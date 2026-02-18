"use client";

import { useState, useEffect } from "react";
import { AttendanceRecord, AttendanceStats, Group } from "@/lib/types";
import { studentApi } from "@/lib/api";
import { formatDate } from "@/lib/telegram";
import { LoadingScreen, EmptyState } from "@/components/shared";
import { StatusBadge, StatsCard } from "@/components/attendance";
import { useTelegram } from "@/hooks/useTelegram";
import { getStoredUser } from "@/lib/auth";

export default function StudentPage() {
  const { user: tgUser } = useTelegram();
  const [storedUser, setStoredUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setStoredUser(getStoredUser());
    Promise.all([
      studentApi.getMyAttendance(),
      studentApi.getMyStats(),
      studentApi.getMyGroup(),
    ])
      .then(([attendanceRes, statsRes, groupRes]) => {
        setRecords(attendanceRes.items);
        setStats(statsRes);
        setGroup(groupRes);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingScreen message="Ma'lumotlar yuklanmoqda..." />;

  const displayName =
    storedUser?.first_name || tgUser?.first_name || "O'quvchi";

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return "var(--status-present)";
    if (pct >= 60) return "var(--status-late)";
    return "var(--status-absent)";
  };

  return (
    <div
      className="page-enter"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Hero header */}
      <div
        style={{
          background: "var(--tg-button)",
          padding: "20px 16px 24px",
          color: "var(--tg-button-text)",
        }}
      >
        <p style={{ fontSize: "13px", opacity: 0.8, margin: "0 0 4px" }}>
          Salom,
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>
          {displayName} 👋
        </h1>
        {group && (
          <p style={{ fontSize: "14px", opacity: 0.85, margin: 0 }}>
            📚 {group.name}
            {group.teacher && ` • ${group.teacher.first_name} ${group.teacher.last_name || ""}`}
          </p>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Percentage card */}
          <div
            style={{
              background: "var(--tg-section-bg)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Circle */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <CircleProgress percentage={stats.percentage} />
            </div>

            <div>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: getPercentageColor(stats.percentage),
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {stats.percentage}%
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--tg-subtitle)",
                  margin: "4px 0 0",
                }}
              >
                Davomat foizi
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--tg-hint)",
                  margin: "2px 0 0",
                }}
              >
                Jami {stats.total_days} dars
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            <StatsCard
              value={stats.present}
              label="Keldi"
              color="var(--status-present)"
              icon="✅"
            />
            <StatsCard
              value={stats.absent}
              label="Kelmadi"
              color="var(--status-absent)"
              icon="❌"
            />
            <StatsCard
              value={stats.late}
              label="Kech keldi"
              color="var(--status-late)"
              icon="⌚"
            />
          </div>
        </div>
      )}

      {/* Attendance history */}
      <div style={{ padding: "0 16px 16px" }}>
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
          Davomat tarixi
        </p>

        {records.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Tarix yo'q"
            description="Hali davomat qayd etilmagan"
          />
        ) : (
          <div className="tg-section">
            {records.map((record, index) => (
              <div
                key={record.id}
                className="tg-list-item"
                style={{
                  borderBottom:
                    index === records.length - 1
                      ? "none"
                      : "0.5px solid var(--tg-secondary-bg)",
                  cursor: "default",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--tg-text)",
                      margin: 0,
                    }}
                  >
                    {formatDate(record.date)}
                  </p>
                  {record.note && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--tg-hint)",
                        margin: "2px 0 0",
                      }}
                    >
                      {record.note}
                    </p>
                  )}
                </div>
                <StatusBadge status={record.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CircleProgress({ percentage }: { percentage: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 80
      ? "var(--status-present)"
      : percentage >= 60
      ? "var(--status-late)"
      : "var(--status-absent)";

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="var(--tg-secondary-bg)"
        strokeWidth="6"
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}
