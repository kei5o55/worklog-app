import type { CalendarMemo, Commit, DaySchedule } from "./types";

export type NewProjectInput = {
  name: string;
  dueDate: string;
  memo: string;
  targetHours: string; // "" or "10" などの文字列
  pomodoroWorkMinutes?: string; // "" or "25" などの文字列
  pomodoroBreakMinutes?: string;
};


//rails側で一意のuuidを付けるため、インプットはid無しで作る
//更新時はもとのtypesからインポートでおｋ（その場合、idもjsonから受け取ったものを適応してやる）


export type NewCommitInput = Omit<Commit, 'id' | 'durationMs'>;

export type NewDayScheduleInput= Omit<DaySchedule, 'id'>;

export type NewCalendarMemoInput= Omit<CalendarMemo,'id'>;

