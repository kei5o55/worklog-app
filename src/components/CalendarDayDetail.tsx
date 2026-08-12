import type { CalendarCell, Project, Commit, DaySchedule } from "../logic/types";
import DayScheduleTimeline from "./DayScheduleTimeline";
import CreateScheduleModal from "./CreateScheduleModal";
import { useState, useEffect } from "react";
import { loadDaySchedulesIdb, addDayScheduleIdb } from "../logic/storage-idb";

type Props = {
  cell: CalendarCell | null;
  projects: Project[];
  schedules?: DaySchedule[];
  onAddMemo?: (date: string) => void;
  onDeleteMemo?: (memoId: string) => void;
  onAddSchedule?: (schedule: DaySchedule) => void;
};

// コミットをプロジェクトごとにグループ化
function groupCommitsByProject(cell: CalendarCell, projects: Project[]) {
  const grouped = new Map<
    string,
    { projectName: string; commits: typeof cell.commits }
  >();

  for (const commit of cell.commits) {
    const project = projects.find((p) => p.id === commit.projectId);
    const projectName = project?.name ?? "不明なプロジェクト";

    const existing = grouped.get(commit.projectId);
    if (existing) {
      existing.commits.push(commit);
    } else {
      grouped.set(commit.projectId, { projectName, commits: [commit] });
    }
  }

  return Array.from(grouped.entries()).map(([projectId, value]) => ({
    projectId,
    projectName: value.projectName,
    commits: value.commits,
  }));
}

function calculateTotalMs(commits: Commit[]): number {
  return commits.reduce((acc, commit) => acc + (commit.durationMs || 0), 0);
}

function formatTotalTime(totalMs: number): string {
  if (totalMs <= 0) return "0分";
  const totalMinutes = Math.floor(totalMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}

export default function CalendarDayDetail({
  cell,
  projects,
  schedules: initialSchedules = [],
  onAddMemo,
  onDeleteMemo,
  onAddSchedule,
}: Props) {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<DaySchedule[]>(initialSchedules);

  // 初回マウント時または IndexedDB の同期用にスケジュールを取得
  useEffect(() => {
    async function fetchSchedules() {
      try {
        const idbSchedules = await loadDaySchedulesIdb();
        if (idbSchedules && idbSchedules.length > 0) {
          setSchedules(idbSchedules);
        }
      } catch (error) {
        console.error("Failed to load schedules from IndexedDB:", error);
      }
    }
    fetchSchedules();
  }, []);

  // スケジュール追加ハンドラー
  const handleAddSchedule = async (newSchedule: DaySchedule) => {
    try {
      // IndexedDB に保存
      await addDayScheduleIdb(newSchedule);

      // React State を更新して画面に即時反映
      setSchedules((prev) => [...prev, newSchedule]);

      // 親コンポーネント側のハンドラーがあれば呼び出す
      onAddSchedule?.(newSchedule);
    } catch (error) {
      console.error("Failed to add schedule to IndexedDB:", error);
    }
  };

  if (!cell) {
    return (
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800">日付詳細</h3>
        <p className="mt-1 text-sm text-gray-500">カレンダーの日付をクリックすると詳細が表示されます。</p>
      </div>
    );
  }

  const groupedCommits = groupCommitsByProject(cell, projects);
  const totalMs = calculateTotalMs(cell.commits);
  const formattedTotalTime = formatTotalTime(totalMs);

  // 選択日（cell.date）に一致する予定をフィルタリング
  const daySchedules = schedules.filter((s) => s.date === cell.date);

  return (
    <div className="mt-6 space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Selected Date</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              合計作業時間: <span className="font-bold">{formattedTotalTime}</span>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">{cell.date} の詳細</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
          >
            + 予定追加
          </button>
          <button
            type="button"
            onClick={() => onAddMemo?.(cell.date)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            メモ追加
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左カラム: サマリー情報 */}
        <div className="space-y-6">
          {/* 納期プロジェクト */}
          <div>
            <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              納期プロジェクト
            </h4>
            {cell.dueProjects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-400">納期予定はありません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cell.dueProjects.map((project) => (
                  <span key={project.id} className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
                    {project.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 進行中プロジェクト */}
          <div>
            <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              進行中プロジェクト
            </h4>
            {cell.projects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-400">進行中のプロジェクトはありません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cell.projects.map((project) => (
                  <span key={project.id} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                    {project.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* メモ */}
          <div>
            <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              メモ
            </h4>
            {cell.memos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-400">メモはありません</p>
            ) : (
              <ul className="space-y-2">
                {cell.memos.map((memo) => (
                  <li key={memo.id} className="group flex items-start justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/40 p-3 text-xs text-amber-900 transition hover:bg-amber-50">
                    <span className="leading-relaxed">{memo.text}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteMemo?.(memo.id)}
                      className="shrink-0 rounded p-1 text-amber-400 opacity-80 transition hover:bg-amber-100 hover:text-amber-700 group-hover:opacity-100"
                      title="削除"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 作業ログ（プロジェクト別まとめ） */}
          <div>
            <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              作業ログ
            </h4>
            {cell.commits.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-400">作業ログはありません</p>
            ) : (
              <div className="space-y-3">
                {groupedCommits.map((group) => (
                  <div key={group.projectId} className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50/50">
                    <div className="border-b border-gray-100 bg-gray-100/60 px-3 py-1.5 text-xs font-semibold text-gray-700">
                      {group.projectName}
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {group.commits.map((commit) => (
                        <li key={commit.id} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                          <span className="truncate">{commit.note?.trim() ? commit.note : "メモ無し"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右カラム: タイムスケジュール */}
        <DayScheduleTimeline
          schedules={daySchedules}
          commits={cell.commits}
          projects={projects}
        />
      </div>

      {/* 予定追加モーダル */}
      <CreateScheduleModal
        open={isScheduleModalOpen}
        defaultDate={cell.date}
        projects={projects}
        existingSchedules={schedules}
        onClose={() => setIsScheduleModalOpen(false)}
        onAdd={handleAddSchedule}
      />
    </div>
  );
}