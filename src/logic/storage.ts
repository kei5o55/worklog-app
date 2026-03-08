// src/logic/storage.ts

import type { Project, WorkSession, Commit, CalendarMemo } from "./types";

// ===== Keys =====
export const STORAGE_KEYS = {
  projects: "myapp.projects.v1",
  sessions: "worklog:sessions:v1",
  commits: "worklog:commits:v1",
  calendarMemos: "worklog:calendar-memos:v1",
} as const;

// ===== Helpers =====
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeString(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t ? t : undefined;
}
// 既に loadCommits がある前提
export function getCommitById(commitId: string): Commit | null {
    const commits = loadCommits();
    return commits.find((c) => c.id === commitId) ?? null;
}

export function getCommit(projectId: string, commitId: string): Commit | null {
    const commits = loadCommits();
    return commits.find((c) => c.id === commitId && c.projectId === projectId) ?? null;
}

// ===== Projects =====
export function normalizeProject(p: Project): Project {
  const th =
    typeof p.targetHours === "number" && Number.isFinite(p.targetHours) && p.targetHours > 0
      ? p.targetHours
      : undefined;

  return {
    ...p,
    dueDate: normalizeString(p.dueDate),
    memo: normalizeString(p.memo),
    targetHours: th,
    startDate: normalizeString(p.startDate),
    endDate: normalizeString(p.endDate),
    color: normalizeString(p.color),
  };
}

export function loadProjects(): Project[] {
  const parsed = safeJsonParse<unknown>(localStorage.getItem(STORAGE_KEYS.projects));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x: any) => x && typeof x.id === "string" && typeof x.name === "string")
    .map((x: any) =>
      normalizeProject({
        id: x.id,
        name: x.name,
        dueDate: typeof x.dueDate === "string" ? x.dueDate : undefined,
        memo: typeof x.memo === "string" ? x.memo : undefined,
        createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
        targetHours: typeof x.targetHours === "number" ? x.targetHours : undefined,
        startDate: typeof x.startDate === "string" ? x.startDate : undefined,
        endDate: typeof x.endDate === "string" ? x.endDate : undefined,
        color: typeof x.color === "string" ? x.color : undefined,
      })
    );
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(
    STORAGE_KEYS.projects,
    JSON.stringify(projects.map(normalizeProject))
  );
}

export function clearProjects() {
  localStorage.removeItem(STORAGE_KEYS.projects);
}


// ===== Calendar Memos =====
function normalizeCalendarMemo(memo: CalendarMemo): CalendarMemo {
  return {
    id: memo.id,
    date: normalizeString(memo.date) ?? "",
    text: normalizeString(memo.text) ?? "",
    createdAt: typeof memo.createdAt === "number" ? memo.createdAt : Date.now(),
  };
}

export function loadCalendarMemos(): CalendarMemo[] {
  const parsed = safeJsonParse<unknown>(localStorage.getItem(STORAGE_KEYS.calendarMemos));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (m: any) =>
        m &&
        typeof m.id === "string" &&
        typeof m.date === "string" &&
        typeof m.text === "string"
    )
    .map((m: any) =>
      normalizeCalendarMemo({
        id: m.id,
        date: m.date,
        text: m.text,
        createdAt: typeof m.createdAt === "number" ? m.createdAt : Date.now(),
      })
    )
    .filter((m) => m.date && m.text);
}

export function saveCalendarMemos(memos: CalendarMemo[]) {
  localStorage.setItem(
    STORAGE_KEYS.calendarMemos,
    JSON.stringify(memos.map(normalizeCalendarMemo))
  );
}

export function addCalendarMemo(memo: CalendarMemo) {
  const prev = loadCalendarMemos();
  saveCalendarMemos([memo, ...prev]);
}

export function updateCalendarMemo(updated: CalendarMemo) {
  const prev = loadCalendarMemos();
  saveCalendarMemos(prev.map((m) => (m.id === updated.id ? normalizeCalendarMemo(updated) : m)));
}

export function deleteCalendarMemo(memoId: string) {
  const prev = loadCalendarMemos();
  saveCalendarMemos(prev.filter((m) => m.id !== memoId));
}

export function clearCalendarMemos() {
  localStorage.removeItem(STORAGE_KEYS.calendarMemos);
}


// ===== Sessions =====
export function loadSessions(): WorkSession[] {
  const parsed = safeJsonParse<unknown>(localStorage.getItem(STORAGE_KEYS.sessions));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (s: any) =>
        s &&
        typeof s.id === "string" &&
        typeof s.projectId === "string" &&
        typeof s.startedAt === "number"
    )
    .map((s: any) => ({
      id: s.id,
      projectId: s.projectId,
      startedAt: s.startedAt,
      endedAt: typeof s.endedAt === "number" ? s.endedAt : undefined,
      note: typeof s.note === "string" ? s.note : "",
      status: s.status === "paused" ? "paused" : "running",
      pausedAt: typeof s.pausedAt === "number" ? s.pausedAt : undefined,
    }));
}

export function saveSessions(sessions: WorkSession[]) {
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
}

export function clearSessions() {
  localStorage.removeItem(STORAGE_KEYS.sessions);
}

// ===== Commits =====
export function loadCommits(): Commit[] {
  const parsed = safeJsonParse<unknown>(localStorage.getItem(STORAGE_KEYS.commits));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (c: any) =>
        c &&
        typeof c.id === "string" &&
        typeof c.projectId === "string" &&
        typeof c.startedAt === "number" &&
        typeof c.endedAt === "number"
    )
    .map((c: any) => ({
      id: c.id,
      projectId: c.projectId,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      durationMs: typeof c.durationMs === "number" ? c.durationMs : c.endedAt - c.startedAt,
      note: typeof c.note === "string" ? c.note : "",
    }));
}

export function saveCommits(commits: Commit[]) {
  localStorage.setItem(STORAGE_KEYS.commits, JSON.stringify(commits));
}

export function addCommit(commit: Commit) {
  const prev = loadCommits();
  saveCommits([commit, ...prev]);
}

export function clearCommits() {
  localStorage.removeItem(STORAGE_KEYS.commits);
}

// ===== “全部消す” =====
export function clearAllStorage() {
  clearProjects();
  clearSessions();
  clearCommits();
  clearCalendarMemos();
}