import type { Commit } from "./types";

export type NewProjectInput = {
  name: string;
  dueDate: string;
  memo: string;
  targetHours: string; // "" or "10" などの文字列
  pomodoroWorkMinutes?: string; // "" or "25" などの文字列
  pomodoroBreakMinutes?: string;
};

export type NewCommitInput = Omit<Commit, 'id' | 'durationMs'>;