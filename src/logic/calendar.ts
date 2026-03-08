import type { CalendarCell, CalendarMemo, Commit, Project } from "./types";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDateInRange(target: string, start?: string, end?: string): boolean {
  if (!start && !end) return false;
  if (start && end) return target >= start && target <= end;
  if (start) return target >= start;
  if (end) return target <= end;
  return false;
}

function isCommitOnDate(commit: Commit, date: string): boolean {
  const started = formatDate(new Date(commit.startedAt));
  return started === date;
}

export function buildCalendarCells(
  year: number,
  month: number,
  projects: Project[],
  memos: CalendarMemo[],
  commits: Commit[]
): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const startWeekDay = firstDay.getDay();

  const calendarStart = new Date(year, month, 1 - startWeekDay);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < 42; i++) {
    const current = new Date(calendarStart);
    current.setDate(calendarStart.getDate() + i);

    const date = formatDate(current);

    const dayProjects = projects.filter((p) =>
      isDateInRange(date, p.startDate, p.endDate)
    );

    const dayMemos = memos.filter((m) => m.date === date);

    const dayCommits = commits.filter((c) => isCommitOnDate(c, date));

    cells.push({
      date,
      isCurrentMonth: current.getMonth() === month,
      projects: dayProjects,
      memos: dayMemos,
      commits: dayCommits,
    });
  }

  return cells;
}