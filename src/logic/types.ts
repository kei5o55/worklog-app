// src/logic/types.ts



export type IconImage = {
  name: string;
  size: number;
  type: string; // MIMEタイプ (例: image/png)
  blob: Blob;
};

export type User = {
  id: string;
  name: string;
  icon?: IconImage;
  bio?: string;
  bgmUrl?: string; // 作業BGMリンク用
  createdAt?: number;
  updatedAt?: number;
};

export type Project = {
  id: string;
  name: string;
  dueDate?: string; // "YYYY-MM-DD"
  memo?: string;
  createdAt: number;
  targetHours?: number;
  pomodoroWorkMinutes?: number;
  pomodoroBreakMinutes?: number;
  completed:boolean;

  // カレンダー表示用
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  color?: string; // 例: "#4f8cff"
};

export type WorkSessionStatus = "running" | "paused";

export type TimerMode = "idle" | "work" | "break";

export type WorkSession = {
  id: string;
  projectId: string;
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

export type CommitImage = {
  name: string;
  type: string;
  size: number;
  blob: Blob;
};

export type Commit = {
  id: string;
  projectId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  note?: string;
  image?: CommitImage | null;
};

// 日付セルに置く個人メモ
export type CalendarMemo = {
  id: string;
  date: string; // "YYYY-MM-DD"
  text: string;
  createdAt: number;
};
export type DaySchedule = {
  id: string;
  date: string; // YYYY-MM-DD

  title: string;

  startHour: number; // 0~23
  startMinute: number;

  endHour: number;
  endMinute: number;

  color?: string;

  projectId?: string;
};

// カレンダー描画用に組み立てたセルデータ
export type CalendarCell = {
  date: string; // "YYYY-MM-DD"
  isCurrentMonth: boolean;
  isCurrendDay: boolean;
  projects: Project[]; // その日に進行中のプロジェクト
  dueProjects: Project[]; // 納期がその日のプロジェクト
  memos: CalendarMemo[];
  commits: Commit[];
  schedules?: DaySchedule[];
};
