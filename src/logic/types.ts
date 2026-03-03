// src/logic/types.ts

export type ProjectId = string;

export type Project = {
    id: ProjectId;
    name: string;
  dueDate?: string; // "YYYY-MM-DD"
    memo?: string;
    createdAt: number;
};

export type WorkSessionStatus = "running" | "paused";

export type WorkSession = {
    id: string;
    projectId: ProjectId;
    startedAt: number;
    endedAt?: number;
    note: string;
    status: WorkSessionStatus;
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
