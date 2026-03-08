// src/logic/types.ts

export type ProjectId = string;

export type Project = {
    id: ProjectId;
    name: string;
    dueDate?: string; // "YYYY-MM-DD"
    memo?: string;
    createdAt: number;
    targetHours?: number; // 追加：目標作業時間（時間）
};

export type WorkSessionStatus = "running" | "paused";

export type TimerMode="normal" | "pomodoro";

export type WorkSession = {
    id: string;
    projectId: ProjectId;
    startedAt: number;
    endedAt?: number;
    note: string;
    status: WorkSessionStatus;
    timerMode?: TimerMode;
    pomodoloCount?: number; 
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
