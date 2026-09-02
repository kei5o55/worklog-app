import { openDB, type DBSchema } from "idb";
import type { Project, WorkSession, Commit, CalendarMemo, DaySchedule, User} from "./types";
import {initialuUser} from "./types";

export const IDB_NAME = "worklog-db";
export const IDB_VERSION = 3; // userProfileストア追加のためバージョンアップ (2 -> 3)

export const STORE_NAMES = {
  projects: "projects",
  sessions: "sessions",
  commits: "commits",
  calendarMemos: "calendarMemos",
  daySchedules: "daySchedules",
  userProfile: "userProfile", // 追加
} as const;

// ユーザープロフィールの固定キー
export const CURRENT_USER_KEY = "current_user";

interface WorklogDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  sessions: {
    key: string;
    value: WorkSession;
  };
  commits: {
    key: string;
    value: Commit;
  };
  calendarMemos: {
    key: string;
    value: CalendarMemo;
  };
  daySchedules: {
    key: string;
    value: DaySchedule;
  };
  userProfile: { // 追加
    key: string;
    value: User;
  };
}

function normalizeString(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t ? t : undefined;
}

export function normalizeProject(p: Project): Project {
  const th =
    typeof p.targetHours === "number" &&
    Number.isFinite(p.targetHours) &&
    p.targetHours > 0
      ? p.targetHours
      : undefined;

  const pwm =
    typeof p.pomodoroWorkMinutes === "number" &&
    Number.isFinite(p.pomodoroWorkMinutes) &&
    p.pomodoroWorkMinutes > 0
      ? p.pomodoroWorkMinutes
      : undefined;

  const pbm =
    typeof p.pomodoroBreakMinutes === "number" &&
    Number.isFinite(p.pomodoroBreakMinutes) &&
    p.pomodoroBreakMinutes > 0
      ? p.pomodoroBreakMinutes
      : undefined;

  return {
    ...p,
    dueDate: normalizeString(p.dueDate),
    memo: normalizeString(p.memo),
    targetHours: th,
    pomodoroWorkMinutes: pwm,
    pomodoroBreakMinutes: pbm,
  };
}

function normalizeCalendarMemo(memo: CalendarMemo): CalendarMemo {
  return {
    id: memo.id,
    date: normalizeString(memo.date) ?? "",
    text: normalizeString(memo.text) ?? "",
    createdAt: typeof memo.createdAt === "number" ? memo.createdAt : Date.now(),
  };
}

function normalizeDaySchedule(s: DaySchedule): DaySchedule {
  return {
    id: s.id,
    date: normalizeString(s.date) ?? "",
    title: normalizeString(s.title) ?? "",
    startHour: typeof s.startHour === "number" ? Math.max(0, Math.min(23, s.startHour)) : 0,
    startMinute: typeof s.startMinute === "number" ? Math.max(0, Math.min(59, s.startMinute)) : 0,
    endHour: typeof s.endHour === "number" ? Math.max(0, Math.min(23, s.endHour)) : 0,
    endMinute: typeof s.endMinute === "number" ? Math.max(0, Math.min(59, s.endMinute)) : 0,
    color: normalizeString(s.color),
    projectId: normalizeString(s.projectId),
  };
}

// ユーザープロフィールの正規化ヘルパー
function normalizeUserProfile(user: User): User {
  return {
    ...user,
    id: user.id || CURRENT_USER_KEY,
    name: normalizeString(user.name) ?? "No Name",
    bio: normalizeString(user.bio),
    bgmUrl: normalizeString(user.bgmUrl),
  };
}

export const dbPromise =
  typeof window !== "undefined"
    ? openDB<WorklogDB>(IDB_NAME, IDB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAMES.projects)) {
            db.createObjectStore(STORE_NAMES.projects, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.sessions)) {
            db.createObjectStore(STORE_NAMES.sessions, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.commits)) {
            db.createObjectStore(STORE_NAMES.commits, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.calendarMemos)) {
            db.createObjectStore(STORE_NAMES.calendarMemos, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.daySchedules)) {
            db.createObjectStore(STORE_NAMES.daySchedules, { keyPath: "id" });
          }
          // 追加: userProfileストアの作成
          if (!db.objectStoreNames.contains(STORE_NAMES.userProfile)) {
            db.createObjectStore(STORE_NAMES.userProfile, { keyPath: "id" });
          }
        },
      })
    : Promise.resolve(null as any);

// ===== Projects =====
export async function loadProjectsIdb(): Promise<Project[]> {
  const db = await dbPromise;
  if (!db) return [];
  const items = await db.getAll(STORE_NAMES.projects);
  return items.map(normalizeProject);
}

export async function saveProjectsIdb(projects: Project[]): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  const tx = db.transaction(STORE_NAMES.projects, "readwrite");
  await tx.store.clear();
  for (const project of projects.map(normalizeProject)) {
    await tx.store.put(project);
  }
  await tx.done;
}

export async function clearProjectsIdb(): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.clear(STORE_NAMES.projects);
}

// ===== Sessions =====
export async function loadSessionsIdb(): Promise<WorkSession[]> {
  const db = await dbPromise;
  if (!db) return [];
  return db.getAll(STORE_NAMES.sessions);
}

export async function saveSessionsIdb(sessions: WorkSession[]): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  const tx = db.transaction(STORE_NAMES.sessions, "readwrite");
  await tx.store.clear();
  for (const session of sessions) {
    await tx.store.put(session);
  }
  await tx.done;
}

export async function clearSessionsIdb(): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.clear(STORE_NAMES.sessions);
}

// ===== Commits =====
export async function loadCommitsIdb(): Promise<Commit[]> {
  const db = await dbPromise;
  if (!db) return [];
  return db.getAll(STORE_NAMES.commits);
}

export async function saveCommitsIdb(commits: Commit[]): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  const tx = db.transaction(STORE_NAMES.commits, "readwrite");
  await tx.store.clear();
  for (const commit of commits) {
    await tx.store.put(commit);
  }
  await tx.done;
}

export async function addCommitIdb(commit: Commit): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.put(STORE_NAMES.commits, commit);
}

export async function getCommitByIdIdb(
  commitId: string,
): Promise<Commit | null> {
  const db = await dbPromise;
  if (!db) return null;
  return (await db.get(STORE_NAMES.commits, commitId)) ?? null;
}

export async function getCommitIdb(
  projectId: string,
  commitId: string,
): Promise<Commit | null> {
  const db = await dbPromise;
  if (!db) return null;
  const commit = await db.get(STORE_NAMES.commits, commitId);
  if (!commit || commit.projectId !== projectId) return null;
  return commit;
}

export async function clearCommitsIdb(): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.clear(STORE_NAMES.commits);
}

// ===== Calendar Memos =====
export async function loadCalendarMemosIdb(): Promise<CalendarMemo[]> {
  const db = await dbPromise;
  if (!db) return [];
  const items = await db.getAll(STORE_NAMES.calendarMemos);
  return items
    .map(normalizeCalendarMemo)
    .filter((m: CalendarMemo) => m.date && m.text);
}

export async function saveCalendarMemosIdb(
  memos: CalendarMemo[],
): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  const tx = db.transaction(STORE_NAMES.calendarMemos, "readwrite");
  await tx.store.clear();
  for (const memo of memos.map(normalizeCalendarMemo)) {
    await tx.store.put(memo);
  }
  await tx.done;
}

export async function addCalendarMemoIdb(memo: CalendarMemo): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.put(STORE_NAMES.calendarMemos, normalizeCalendarMemo(memo));
}

export async function updateCalendarMemoIdb(
  updated: CalendarMemo,
): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.put(STORE_NAMES.calendarMemos, normalizeCalendarMemo(updated));
}

export async function deleteCalendarMemoIdb(memoId: string): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.delete(STORE_NAMES.calendarMemos, memoId);
}

export async function clearCalendarMemosIdb(): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.clear(STORE_NAMES.calendarMemos);
}

// ===== Day Schedules =====
export async function loadDaySchedulesIdb(): Promise<DaySchedule[]> {
  const db = await dbPromise;
  if (!db) return [];
  const items = await db.getAll(STORE_NAMES.daySchedules);
  return items
    .map(normalizeDaySchedule)
    .filter((s: DaySchedule) => s.date && s.title);
}

export async function saveDaySchedulesIdb(
  schedules: DaySchedule[],
): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  const tx = db.transaction(STORE_NAMES.daySchedules, "readwrite");
  await tx.store.clear();
  for (const schedule of schedules.map(normalizeDaySchedule)) {
    await tx.store.put(schedule);
  }
  await tx.done;
}

export async function addDayScheduleIdb(schedule: DaySchedule): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.put(STORE_NAMES.daySchedules, normalizeDaySchedule(schedule));
}

export async function updateDayScheduleIdb(
  updated: DaySchedule,
): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.put(STORE_NAMES.daySchedules, normalizeDaySchedule(updated));
}

export async function deleteDayScheduleIdb(scheduleId: string): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.delete(STORE_NAMES.daySchedules, scheduleId);
}

export async function clearDaySchedulesIdb(): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.clear(STORE_NAMES.daySchedules);
}

// ===== User Profile (追加) =====
export async function loadUserProfileIdb(): Promise<User> {
  const db = await dbPromise;
  if (!db) return initialuUser;
  const user = await db.get(STORE_NAMES.userProfile, CURRENT_USER_KEY);
  return user ? normalizeUserProfile(user) : initialuUser;
}

export async function saveUserProfileIdb(user: User): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  const normalized = normalizeUserProfile({
    ...user,
    id: CURRENT_USER_KEY, // キーを固定して保存
  });
  await db.put(STORE_NAMES.userProfile, normalized);
}

export async function clearUserProfileIdb(): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  await db.clear(STORE_NAMES.userProfile);
}

// ===== Global Reset =====
export async function clearAllStorageIdb(): Promise<void> {
  const db = await dbPromise;
  if (!db) return;
  const tx = db.transaction(
    [
      STORE_NAMES.projects,
      STORE_NAMES.sessions,
      STORE_NAMES.commits,
      STORE_NAMES.calendarMemos,
      STORE_NAMES.daySchedules,
      STORE_NAMES.userProfile, // 追加
    ],
    "readwrite",
  );

  await tx.objectStore(STORE_NAMES.projects).clear();
  await tx.objectStore(STORE_NAMES.sessions).clear();
  await tx.objectStore(STORE_NAMES.commits).clear();
  await tx.objectStore(STORE_NAMES.calendarMemos).clear();
  await tx.objectStore(STORE_NAMES.daySchedules).clear();
  await tx.objectStore(STORE_NAMES.userProfile).clear(); // 追加

  await tx.done;
}