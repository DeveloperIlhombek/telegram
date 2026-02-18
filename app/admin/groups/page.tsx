"use client";

import { useState, useEffect } from "react";
import { Group, User } from "@/lib/types";
import { adminApi } from "@/lib/api";
import { haptic, tgConfirm, tgAlert } from "@/lib/telegram";
import { PageHeader, LoadingScreen, EmptyState } from "@/components/shared";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    teacher_id: "",
    subject: "",
    schedule: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [groupsRes, teachersRes] = await Promise.all([
        adminApi.getGroups(),
        adminApi.getTeachers(),
      ]);
      setGroups(groupsRes.items);
      setTeachers(teachersRes.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!form.name.trim() || !form.teacher_id) {
      await tgAlert("Guruh nomi va o'qituvchini kiriting!");
      return;
    }

    haptic.medium();
    try {
      await adminApi.createGroup({
        name: form.name.trim(),
        teacher_id: parseInt(form.teacher_id),
        subject: form.subject.trim() || undefined,
        schedule: form.schedule.trim() || undefined,
      });
      haptic.success();
      setForm({ name: "", teacher_id: "", subject: "", schedule: "" });
      setShowForm(false);
      loadData();
    } catch {
      haptic.error();
      await tgAlert("Xatolik yuz berdi!");
    }
  };

  const handleDelete = async (group: Group) => {
    const confirmed = await tgConfirm(
      `"${group.name}" guruhini o'chirish?`
    );
    if (!confirmed) return;

    haptic.medium();
    try {
      await adminApi.deleteGroup(group.id);
      haptic.success();
      loadData();
    } catch {
      haptic.error();
      await tgAlert("O'chirib bo'lmadi!");
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Guruhlar"
        subtitle={`${groups.length} ta guruh`}
        rightAction={
          <button
            onClick={() => {
              haptic.light();
              setShowForm(!showForm);
            }}
            style={{
              background: showForm ? "var(--tg-secondary-bg)" : "var(--tg-button)",
              color: showForm ? "var(--tg-text)" : "var(--tg-button-text)",
              border: "none",
              borderRadius: "20px",
              padding: "6px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showForm ? "Bekor" : "+ Qo'shish"}
          </button>
        }
      />

      {/* Add form */}
      {showForm && (
        <div
          className="page-enter"
          style={{
            padding: "16px",
            backgroundColor: "var(--tg-bg)",
            borderBottom: "0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              placeholder="Guruh nomi *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
            <select
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">O'qituvchini tanlang *</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
            <input
              placeholder="Fan nomi (ixtiyoriy)"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Dars jadvali (ixtiyoriy)"
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              style={inputStyle}
            />
            <button className="tg-btn" onClick={handleCreate}>
              Guruh qo'shish
            </button>
          </div>
        </div>
      )}

      {/* Groups list */}
      <div style={{ padding: "16px" }}>
        {groups.length === 0 ? (
          <EmptyState
            icon="📚"
            title="Guruhlar yo'q"
            description="Yangi guruh qo'shing"
          />
        ) : (
          <div className="tg-section">
            {groups.map((group, index) => (
              <div
                key={group.id}
                className="tg-list-item"
                style={{
                  borderBottom:
                    index === groups.length - 1
                      ? "none"
                      : "0.5px solid var(--tg-secondary-bg)",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    backgroundColor: "color-mix(in srgb, var(--tg-button) 15%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  📚
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--tg-text)",
                      margin: 0,
                    }}
                  >
                    {group.name}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--tg-subtitle)", margin: "2px 0 0" }}>
                    {group.teacher
                      ? `${group.teacher.first_name} ${group.teacher.last_name || ""}`
                      : "O'qituvchi belgilanmagan"}
                    {group.subject && ` • ${group.subject}`}
                  </p>
                  {group.student_count !== undefined && (
                    <p style={{ fontSize: "12px", color: "var(--tg-hint)", margin: "1px 0 0" }}>
                      {group.student_count} ta o'quvchi
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(group)}
                  style={{
                    background: "color-mix(in srgb, var(--status-absent) 12%, transparent)",
                    color: "var(--status-absent)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  O'chir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  backgroundColor: "var(--tg-secondary-bg)",
  border: "none",
  borderRadius: "12px",
  fontSize: "15px",
  color: "var(--tg-text)",
  outline: "none",
};
