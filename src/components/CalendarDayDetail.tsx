import type { CalendarCell, Project, Commit } from "../logic/types";

type Props = {
  cell: CalendarCell | null;
  projects: Project[];
  onAddMemo?: (date: string) => void;
  onDeleteMemo?: (memoId: string) => void;
};

// コミットをプロジェクトごとにグループ化
function groupCommitsByProject(cell: CalendarCell, projects: Project[]) {
  const grouped = new Map<
    string,
    {
      projectName: string;
      commits: typeof cell.commits;
    }
  >();

  for (const commit of cell.commits) {
    const project = projects.find((p) => p.id === commit.projectId);
    const projectName = project?.name ?? "不明なプロジェクト";

    const existing = grouped.get(commit.projectId);
    if (existing) {
      existing.commits.push(commit);
    } else {
      grouped.set(commit.projectId, {
        projectName,
        commits: [commit],
      });
    }
  }

  return Array.from(grouped.entries()).map(([projectId, value]) => ({
    projectId,
    projectName: value.projectName,
    commits: value.commits,
  }));
}

// タイムライン用にコミットを「時間（0〜23）」ごとにグループ化
function groupCommitsByHour(commits: Commit[]) {
  const hourlyMap = new Map<number, Commit[]>();

  for (const commit of commits) {
    // startedAt や createdAt 等から時間を取得
    const rawTime = commit.startedAt ?? (commit as Record<string, unknown>).createdAt ?? (commit as Record<string, unknown>).timestamp;
    if (!rawTime) continue;

    const dateObj = new Date(rawTime);
    if (isNaN(dateObj.getTime())) continue;

    const hour = dateObj.getHours();
    const existing = hourlyMap.get(hour) ?? [];
    existing.push(commit);
    hourlyMap.set(hour, existing);
  }

  return hourlyMap;
}

// 合計作業時間（ミリ秒）を計算
function calculateTotalMs(commits: Commit[]): number {
  return commits.reduce((acc, commit) => acc + (commit.durationMs || 0), 0);
}

// ミリ秒を「○時間○分」フォーマットに整形
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
  onAddMemo,
  onDeleteMemo,
}: Props) {
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
  const hourlyCommits = groupCommitsByHour(cell.commits);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 作業時間の算出
  const totalMs = calculateTotalMs(cell.commits);
  const formattedTotalTime = formatTotalTime(totalMs);

  return (
    <div className="mt-6 space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Selected Date</span>
            {/* 作業時間累計バッジ */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              合計作業時間: <span className="font-bold">{formattedTotalTime}</span>
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">{cell.date} の詳細</h3>
        </div>

        <button
          type="button"
          onClick={() => onAddMemo?.(cell.date)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          メモ追加
        </button>
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

        {/* 右カラム: 実データ連動 タイムライン */}
        <div className="flex flex-col rounded-lg border border-gray-100 bg-gray-50/30 p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">タイムライン</h4>

          <div className="max-h-[460px] space-y-1 overflow-y-auto pr-1">
            {hours.map((hour) => {
              const formattedHour = hour.toString().padStart(2, "0");
              const commitsAtHour = hourlyCommits.get(hour) ?? [];

              return (
                <div key={hour} className="group flex items-start gap-3 rounded border-b border-gray-100/80 py-2 transition hover:bg-white">
                  <div className="w-12 shrink-0 font-mono text-xs font-medium text-gray-400 group-hover:text-indigo-600">
                    {formattedHour}:00
                  </div>

                  <div className="min-h-[22px] flex-1 space-y-1 text-xs">
                    {commitsAtHour.length > 0 ? (
                      commitsAtHour.map((c) => {
                        const proj = projects.find((p) => p.id === c.projectId);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/10"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            {proj && <span className="font-semibold text-emerald-950">[{proj.name}]</span>}
                            <span className="truncate">{c.note || "作業ログ"}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-gray-300 opacity-0 group-hover:opacity-100">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}