"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Group, Student } from "@/lib/types";
import { teacherApi } from "@/lib/api";
import { haptic, tgConfirm, tgAlert, getTodayISO, formatDate } from "@/lib/telegram";
import { LoadingScreen, EmptyState } from "@/components/shared";
import {
  StudentAttendanceCard,
  AttendanceSummary,
} from "@/components/attendance";
import { useAttendance } from "@/hooks/useAttendance";

export default function AttendancePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const id = parseInt(groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unmarked">("all");

  const {
    setStatus,
    setAllStatus,
    submitAttendance,
    getStatus,
    getPresentCount,
    getAbsentCount,
    getLateCount,
    isSaving,
    isSubmitted,
    checkExisting,
  } = useAttendance();

  const today = getTodayISO();
  const todayFormatted = formatDate(today);

  useEffect(() => {
    Promise.all([
      teacherApi.getGroupStudents(id),
      teacherApi.getMyGroups(),
    ])
      .then(([studs, groups]) => {
        setStudents(studs);
        const g = groups.find((g) => g.id === id);
        setGroup(g || null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    checkExisting(id);
  }, [id, checkExisting]);

  const handleMarkAll = async (status: "present" | "absent") => {
    const label = status === "present" ? "Hammani keldi" : "Hammani kelmadi";
    const confirmed = await tgConfirm(
      `${label} deb belgilash?`
    );
    if (confirmed) {
      haptic.medium();
      setAllStatus(students, status);
    }
  };

  const handleSubmit = async () => {
    const unmarked = students.filter((s) => !getStatus(s.id));
    if (unmarked.length > 0) {
      const confirmed = await tgConfirm(
        `${unmarked.length} ta o'quvchi belgilanmagan. Ular "Kelmadi" deb saqlanadi. Davom etasizmi?`
      );
      if (!confirmed) return;
      unmarked.forEach((s) => setStatus(s.id, "absent"));
    }

    haptic.medium();
    const success = await submitAttendance(id, students);

    if (success) {
      haptic.success();
      await tgAlert("✅ Davomat muvaffaqiyatli saqlandi!");
      router.back();
    } else {
      haptic.error();
      await tgAlert("❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  };

  const filteredStudents =
    filter === "unmarked"
      ? students.filter((s) => !getStatus(s.id))
      : students;

  const markedCount = students.filter((s) => getStatus(s.id)).length;
  const totalCount = students.length;
  const allMarked = markedCount === totalCount && totalCount > 0;

  if (isLoading) return <LoadingScreen message="O'quvchilar yuklanmoqda..." />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--tg-secondary-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "var(--tg-bg)",
          padding: "12px 16px",
          flexShrink: 0,
          borderBottom: "0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <button
            onClick={() => {
              haptic.light();
              router.back();
            }}
            style={{
              background: "var(--tg-secondary-bg)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              color: "var(--tg-link)",
              flexShrink: 0,
            }}
          >
            ‹
          </button>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--tg-text)",
                margin: 0,
              }}
            >
              {group?.name || "Guruh"}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--tg-subtitle)", margin: 0 }}>
              {todayFormatted} • {markedCount}/{totalCount} belgilandi
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "10px",
              border: "1.5px solid var(--status-present)",
              background: "color-mix(in srgb, var(--status-present) 10%, transparent)",
              color: "var(--status-present)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => handleMarkAll("present")}
            disabled={isSubmitted}
          >
            ✓ Hammasi keldi
          </button>
          <button
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "10px",
              border: "1.5px solid var(--status-absent)",
              background: "color-mix(in srgb, var(--status-absent) 10%, transparent)",
              color: "var(--status-absent)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => handleMarkAll("absent")}
            disabled={isSubmitted}
          >
            ✗ Hech kim kelmadi
          </button>
        </div>
      </div>

      {/* Summary */}
      <AttendanceSummary
        present={getPresentCount()}
        absent={getAbsentCount()}
        late={getLateCount()}
        total={totalCount}
      />

      {/* Filter tabs */}
      <div
        style={{
          backgroundColor: "var(--tg-bg)",
          padding: "8px 16px",
          display: "flex",
          gap: "8px",
          flexShrink: 0,
          borderBottom: "0.5px solid color-mix(in srgb, var(--tg-hint) 15%, transparent)",
        }}
      >
        {[
          { key: "all", label: `Hammasi (${totalCount})` },
          {
            key: "unmarked",
            label: `Belgilanmagan (${totalCount - markedCount})`,
          },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              haptic.select();
              setFilter(key as "all" | "unmarked");
            }}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor:
                filter === key
                  ? "var(--tg-button)"
                  : "var(--tg-secondary-bg)",
              color:
                filter === key ? "var(--tg-button-text)" : "var(--tg-hint)",
              transition: "all 0.2s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Student list */}
      <div className="scroll-area" style={{ flex: 1 }}>
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="Barcha o'quvchilar belgilandi"
            description="Pastdagi tugmani bosib davomatni saqlang"
          />
        ) : (
          <div className="tg-section" style={{ borderRadius: 0 }}>
            {filteredStudents.map((student, index) => (
              <StudentAttendanceCard
                key={student.id}
                student={student}
                status={getStatus(student.id)}
                onStatusChange={setStatus}
                index={index}
                disabled={isSubmitted}
              />
            ))}
          </div>
        )}

        {/* Bottom padding for submit button */}
        <div style={{ height: "80px" }} />
      </div>

      {/* Submit button */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          backgroundColor: "var(--tg-bg)",
          borderTop: "0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)",
        }}
      >
        {isSubmitted ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--status-present)",
              fontWeight: 600,
              fontSize: "15px",
              padding: "12px",
            }}
          >
            ✅ Davomat saqlangan
          </div>
        ) : (
          <button
            className="tg-btn"
            onClick={handleSubmit}
            disabled={isSaving || totalCount === 0}
          >
            {isSaving ? (
              "Saqlanmoqda..."
            ) : allMarked ? (
              "✅ Davomatni Saqlash"
            ) : (
              `Saqlash (${markedCount}/${totalCount})`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
