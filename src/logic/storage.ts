// src/logic/storage.ts

// ===== Keys =====
export const STORAGE_KEYS = {
  projects: "myapp.projects.v1",
  sessions: "worklog:sessions:v1",
  commits: "worklog:commits:v1",
} as const;

// ===== Types =====
export type Project = {
  id: string;
  name: string;
  dueDate?: string; // "YYYY-MM-DD"
  memo?: string;
  createdAt: number;
};

export type WorkSession = {
  id: string;
  projectId: string;
  startedAt: number;
  endedAt?: number;
  note: string;
  status: "running" | "paused";
  pausedAt?: number;
};

export type Commit = {
  id: string;
  projectId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  note: string;
};

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

// ===== Projects =====
export function normalizeProject(p: Project): Project {
  return {
    ...p,
    dueDate: normalizeString(p.dueDate),
    memo: normalizeString(p.memo),
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
}