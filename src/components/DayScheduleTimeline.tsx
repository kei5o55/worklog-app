"use client";

import { useState } from "react";
import type { Commit, Project, DaySchedule } from "../logic/types";

type Props = {
  schedules: DaySchedule[];
  commits: Commit[];
  projects: Project[];
};

type HourlySlot = {
  hour: number;
  timeString: string;
  schedules: DaySchedule[];
  commits: Commit[];
};

function formatTime(h: number, m: number): string {
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// ミリ秒タイムスタンプから "HH:MM" 文字列を生成するヘルパー関数
function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return formatTime(d.getHours(), d.getMinutes());
}

export default function DayScheduleTimeline({
  schedules,
  commits,
  projects,
}: Props) {
  const [selectedSlot, setSelectedSlot] = useState<HourlySlot | null>(null);

  // 0時〜23時の24スロットを生成
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const slots: HourlySlot[] = hours.map((hour) => {
    // その時間の予定（startHour 〜 endHour の間に含まれるか）
    const slotSchedules = schedules.filter(
      (s) => s.startHour <= hour && s.endHour >= hour
    );

    // その時間の作業ログ（startedAt 〜 endedAt の時間内にこの hour が含まれるか）
    const slotCommits = commits.filter((c) => {
      const startH = new Date(c.startedAt).getHours();
      const endH = new Date(c.endedAt).getHours();
      return startH <= hour && endH >= hour;
    });

    return {
      hour,
      timeString: `${hour.toString().padStart(2, "0")}:00`,
      schedules: slotSchedules,
      commits: slotCommits,
    };
  });

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-gray-50/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          タイムライン
        </h4>
        <span className="text-[10px] text-gray-400">枠クリックで詳細を表示</span>
      </div>

      {/* 24時間表示エリア */}
      <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
        {slots.map((slot) => {
          const hasContent = slot.schedules.length > 0 || slot.commits.length > 0;

          return (
            <div
              key={slot.hour}
              onClick={() => setSelectedSlot(slot)}
              className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 transition hover:border-gray-200 hover:bg-white hover:shadow-xs"
            >
              {/* 時間 */}
              <div className="w-12 shrink-0 font-mono text-xs font-medium text-gray-400 group-hover:text-indigo-600">
                {slot.timeString}
              </div>

              {/* 予定 & ログの簡易表示 */}
              <div className="min-h-[24px] flex-1 flex flex-wrap items-center gap-1.5 text-xs">
                {hasContent ? (
                  <>
                    {/* 予定（青・カラーバッジ） */}
                    {slot.schedules.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-white shadow-xs"
                        style={{ backgroundColor: s.color || "#6366f1" }}
                      >
                        📅 {s.title}
                        <span className="opacity-80 text-[10px]">
                          ({formatTime(s.startHour, s.startMinute)}-{formatTime(s.endHour, s.endMinute)})
                        </span>
                      </span>
                    ))}

                    {/* 作業ログ（緑バッジ + 開始・終了時刻） */}
                    {slot.commits.map((c) => {
                      const proj = projects.find((p) => p.id === c.projectId);
                      const startStr = formatTimestamp(c.startedAt);
                      const endStr = formatTimestamp(c.endedAt);

                      return (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          {proj ? `[${proj.name}] ` : ""}
                          <span className="truncate max-w-[120px]">{c.note || "作業ログ"}</span>
                          <span className="opacity-75 text-[10px]">
                            ({startStr}-{endStr})
                          </span>
                        </span>
                      );
                    })}
                  </>
                ) : (
                  <span className="text-gray-300 opacity-0 group-hover:opacity-100 text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 詳細モーダル */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {selectedSlot.timeString} 時間帯の詳細
              </h3>
              <button
                onClick={() => setSelectedSlot(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[50vh] overflow-y-auto">
              {/* 予定 */}
              <div>
                <h5 className="text-xs font-bold uppercase text-indigo-600 mb-1.5">予定</h5>
                {selectedSlot.schedules.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">予定はありません</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedSlot.schedules.map((s) => (
                      <div key={s.id} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs">
                        <div className="font-bold text-indigo-950">{s.title}</div>
                        <div className="text-indigo-600/80 text-[11px] mt-0.5">
                          {formatTime(s.startHour, s.startMinute)} 〜 {formatTime(s.endHour, s.endMinute)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 作業記録 */}
              <div>
                <h5 className="text-xs font-bold uppercase text-emerald-600 mb-1.5">作業記録</h5>
                {selectedSlot.commits.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">作業ログはありません</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedSlot.commits.map((c) => {
                      const proj = projects.find((p) => p.id === c.projectId);
                      const startStr = formatTimestamp(c.startedAt);
                      const endStr = formatTimestamp(c.endedAt);

                      return (
                        <div key={c.id} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs">
                          {proj && <div className="font-semibold text-emerald-900">[{proj.name}]</div>}
                          <div className="text-emerald-800">{c.note || "メモ無し"}</div>
                          <div className="text-emerald-600/80 text-[11px] mt-0.5 font-mono">
                            ⏱ {startStr} 〜 {endStr}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setSelectedSlot(null)}
                className="rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}