"use client";

import { useState, useCallback, useEffect } from "react";
import { AttendanceRecord, AttendanceStatus, Student } from "@/lib/types";
import { teacherApi } from "@/lib/api";
import { getTodayISO } from "@/lib/telegram";

interface AttendanceDraft {
  [studentId: number]: AttendanceStatus;
}

interface UseAttendanceReturn {
  drafts: AttendanceDraft;
  records: AttendanceRecord[];
  isLoading: boolean;
  isSaving: boolean;
  isSubmitted: boolean;
  setStatus: (studentId: number, status: AttendanceStatus) => void;
  setAllStatus: (students: Student[], status: AttendanceStatus) => void;
  submitAttendance: (groupId: number, students: Student[]) => Promise<boolean>;
  getStatus: (studentId: number) => AttendanceStatus | null;
  getPresentCount: () => number;
  getAbsentCount: () => number;
  getLateCount: () => number;
  checkExisting: (groupId: number) => Promise<void>;
}

export function useAttendance(): UseAttendanceReturn {
  const [drafts, setDrafts] = useState<AttendanceDraft>({});
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const setStatus = useCallback(
    (studentId: number, status: AttendanceStatus) => {
      setDrafts((prev) => ({ ...prev, [studentId]: status }));
    },
    []
  );

  const setAllStatus = useCallback(
    (students: Student[], status: AttendanceStatus) => {
      const newDrafts: AttendanceDraft = {};
      students.forEach((s) => {
        newDrafts[s.id] = status;
      });
      setDrafts(newDrafts);
    },
    []
  );

  const getStatus = useCallback(
    (studentId: number): AttendanceStatus | null => {
      return drafts[studentId] ?? null;
    },
    [drafts]
  );

  const checkExisting = useCallback(async (groupId: number) => {
    setIsLoading(true);
    try {
      const today = getTodayISO();
      const existing = await teacherApi.checkTodayAttendance(groupId, today);
      if (existing && existing.length > 0) {
        const newDrafts: AttendanceDraft = {};
        existing.forEach((r) => {
          newDrafts[r.student_id] = r.status;
        });
        setDrafts(newDrafts);
        setRecords(existing);
        setIsSubmitted(true);
      }
    } catch {
      // No existing records = fresh start
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAttendance = useCallback(
    async (groupId: number, students: Student[]): Promise<boolean> => {
      setIsSaving(true);
      try {
        const today = getTodayISO();
        const recordsToSubmit = students.map((s) => ({
          student_id: s.id,
          status: drafts[s.id] || "absent",
        }));

        await teacherApi.submitAttendance(groupId, today, recordsToSubmit);
        setIsSubmitted(true);
        return true;
      } catch (err) {
        console.error("Davomat saqlashda xato:", err);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [drafts]
  );

  const getPresentCount = useCallback(
    () => Object.values(drafts).filter((s) => s === "present").length,
    [drafts]
  );

  const getAbsentCount = useCallback(
    () => Object.values(drafts).filter((s) => s === "absent").length,
    [drafts]
  );

  const getLateCount = useCallback(
    () => Object.values(drafts).filter((s) => s === "late").length,
    [drafts]
  );

  return {
    drafts,
    records,
    isLoading,
    isSaving,
    isSubmitted,
    setStatus,
    setAllStatus,
    submitAttendance,
    getStatus,
    getPresentCount,
    getAbsentCount,
    getLateCount,
    checkExisting,
  };
}
