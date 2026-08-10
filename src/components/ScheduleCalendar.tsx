import { useMemo, useState } from "react";
import { buildCalendarCells } from "../logic/calendar";
import type {
  CalendarCell,
  CalendarMemo,
  Commit,
  Project,
} from "../logic/types";

type Props = {
  year: number;
  month: number;
  projects: Project[];
  memos: CalendarMemo[];
  commits: Commit[];
  onSelectDate?: (cell: CalendarCell) => void;
  moveMonth: (diff: number) => void;
};

const WEEK_LABELS = [
  { label: "日", color: "text-rose-500" },
  { label: "月", color: "text-gray-500" },
  { label: "火", color: "text-gray-500" },
  { label: "水", color: "text-gray-500" },
  { label: "木", color: "text-gray-500" },
  { label: "金", color: "text-gray-500" },
  { label: "土", color: "text-indigo-500" },
];

export default function ScheduleCalendar({
  year,
  month,
  projects,
  memos,
  commits,
  onSelectDate,
  moveMonth,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const cells = useMemo(() => {
    return buildCalendarCells(year, month, projects, memos, commits);
  }, [year, month, projects, memos, commits]);

  return (
    <div className="w-full space-y-4">
      {/* ナビゲーションヘッダー */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">
            {year}年 <span className="text-indigo-600">{month + 1}月</span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
            aria-label="前月へ"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
            aria-label="次月へ"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* カレンダーメイングリッド */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70 text-center text-xs font-bold">
          {WEEK_LABELS.map(({ label, color }) => (
            <div key={label} className={`py-2.5 ${color}`}>
              {label}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-gray-100/50">
          {cells.map((cell) => {
            const day = Number(cell.date.slice(-2));
            const isSelected = selectedDate === cell.date;

            // プロパティ名の表記揺れ（isCurrendDay / isCurrentDay）の安全策
            const isToday =
              (cell as unknown as { isCurrentDay?: boolean }).isCurrentDay ??
              cell.isCurrendDay ??
              false;

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => {
                  setSelectedDate(cell.date);
                  onSelectDate?.(cell);
                }}
                className={`group relative flex min-h-[110px] flex-col p-2 text-left transition ${
                  cell.isCurrentMonth
                    ? "bg-white text-gray-900"
                    : "bg-gray-50/60 text-gray-400"
                } ${
                  isSelected
                    ? "ring-2 ring-inset ring-indigo-600 z-10"
                    : "hover:bg-indigo-50/30"
                }`}
              >
                {/* 日付表示 */}
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? "bg-indigo-600 text-white font-bold"
                        : isSelected
                        ? "text-indigo-600 font-bold"
                        : ""
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* 内容インジケーター */}
                <div className="flex flex-1 flex-col justify-between space-y-1">
                  <div className="space-y-1">
                    {/* 納期 */}
                    {cell.dueProjects.length > 0 && (
                      <div className="inline-flex w-full items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                        <span className="h-1 w-1 rounded-full bg-rose-500"></span>
                        <span className="truncate">納期 {cell.dueProjects.length}件</span>
                      </div>
                    )}

                    {/* 進行中プロジェクト */}
                    {cell.projects.slice(0, 1).map((project) => (
                      <div
                        key={project.id}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs"
                        style={{
                          backgroundColor: project.color ?? "#4f46e5",
                        }}
                        title={project.name}
                      >
                        {project.name}
                      </div>
                    ))}

                    {/* メモ */}
                    {cell.memos.slice(0, 1).map((memo) => (
                      <div
                        key={memo.id}
                        className="flex items-center gap-1 truncate text-[10px] text-gray-600"
                        title={memo.text}
                      >
                        <span className="text-amber-500">•</span>
                        <span className="truncate">{memo.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* コミット数バッジ */}
                  {cell.commits.length > 0 && (
                    <div className="mt-auto pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {cell.commits.length} commits
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}