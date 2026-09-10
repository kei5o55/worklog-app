import type { CalendarMemo, Commit, DaySchedule, Project } from "./types";

export type NewProjectInput = Omit<Project,"id">


//rails側で一意のuuidを付けるため、インプットはid無しで作る
//更新時はもとのtypesからインポートでおｋ（その場合、idもjsonから受け取ったものを適応してやる）


export type NewCommitInput = Omit<Commit, 'id' | 'durationMs'>;

export type NewDayScheduleInput= Omit<DaySchedule, 'id'>;

export type NewCalendarMemoInput= Omit<CalendarMemo,'id'>;

