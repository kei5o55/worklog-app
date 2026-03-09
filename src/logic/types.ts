// src/logic/types.ts

export type ProjectId = string;

export type Project = {
  id: ProjectId;
  name: string;
  dueDate?: string; // "YYYY-MM-DD"
  memo?: string;
  createdAt: number;
  targetHours?: number;

  // カレンダー表示用
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
  color?: string;     // 例: "#4f8cff"
};

export type WorkSessionStatus = "running" | "paused";

export type TimerMode = "normal" | "pomodoro";

export type WorkSession = {
    id: string;
    projectId: ProjectId;
    startedAt: number;
    endedAt?: number;
    note: string;
    status: WorkSessionStatus;
    timerMode?: TimerMode;
    pomodoroCount?: number;
    pomodoroWorkMinutes?: number;
    pomodoroBreakMinutes?: number;
    pausedAt?: number;
};

export type Commit = {
    id: string;
    projectId: ProjectId;
    startedAt: number;
    endedAt: number;
    durationMs: number;
    note: string;
};

// 日付セルに置く個人メモ
export type CalendarMemo = {
    id: string;
    date: string; // "YYYY-MM-DD"
    text: string;
    createdAt: number;
};

// カレンダー描画用に組み立てたセルデータ
export type CalendarCell = {
    date: string; // "YYYY-MM-DD"
    isCurrentMonth: boolean;
    projects: Project[];      // その日に進行中のプロジェクト
    dueProjects: Project[];   // 納期がその日のプロジェクト
    memos: CalendarMemo[];
    commits: Commit[];
};