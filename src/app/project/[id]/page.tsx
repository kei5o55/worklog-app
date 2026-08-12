//src/pages/ProjectDetailPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadProjectsIdb,
  loadCommitsIdb,
  saveProjectsIdb,
} from "../../../logic/storage-idb";
import type { Project, Commit } from "../../../logic/types";
import Link from "next/link";
import { use } from "react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMs(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [workMinutesInput, setWorkMinutesInput] = useState("");
  const [breakMinutesInput, setBreakMinutesInput] = useState("");
  const [projectMemoInput, setProjectMemoInput] = useState("");
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const [projectNameInput, setProjectNameInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  
  // ギャラリー用: Blobから生成した Object URL を安全に保持する State
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const refresh = async () => {
    const [nextProjects, nextCommits] = await Promise.all([
      loadProjectsIdb(),
      loadCommitsIdb(),
    ]);

    setProjects(nextProjects);
    setCommitsAll(nextCommits);
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, []);

  // focus 時および pageshow (戻るボタン押下時) にリフレッシュを呼ぶ
  useEffect(() => {
    const onFocusOrPageShow = () => {
      void refresh();
    };

    window.addEventListener("focus", onFocusOrPageShow);
    window.addEventListener("pageshow", onFocusOrPageShow);
    return () => {
      window.removeEventListener("focus", onFocusOrPageShow);
      window.removeEventListener("pageshow", onFocusOrPageShow);
    };
  }, []);

  const project = useMemo(() => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId) ?? null;
  }, [projects, projectId]);

  useEffect(() => {
    if (!project) return;
    setProjectNameInput(project.name ?? "");
    setWorkMinutesInput(
      project.pomodoroWorkMinutes ? String(project.pomodoroWorkMinutes) : "",
    );
    setBreakMinutesInput(
      project.pomodoroBreakMinutes ? String(project.pomodoroBreakMinutes) : "",
    );
    setProjectMemoInput(project.memo ?? "");
  }, [project]);

  const commits = useMemo(() => {
    if (!projectId) return [];
    return commitsAll
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.endedAt - a.endedAt);
  }, [commitsAll, projectId]);

  const commitsWithImage = useMemo(() => {
    return commits.filter((c) => c.image?.blob);
  }, [commits]);

  // Object URL の生成とクリーンアップ（メモリリーク・レンダリングエラーの防止）
  useEffect(() => {
    const urls: Record<string, string> = {};

    commitsWithImage.forEach((c) => {
      if (c.image?.blob) {
        urls[c.id] = URL.createObjectURL(c.image.blob);
      }
    });

    setImageUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [commitsWithImage]);

  const totalMs = useMemo(
    () => commits.reduce((sum, c) => sum + c.durationMs, 0),
    [commits],
  );

  if (!projectId) {
    return (
      <main className="max-w-3xl mx-auto min-h-screen px-4 py-12 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Project not found</h2>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 py-2 px-4 rounded-xl shadow-sm transition-colors"
        >
          ← Projectsへ戻る
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto min-h-screen px-4 py-12">
        <div className="flex items-center justify-center p-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-slate-400 font-medium text-sm">
          Loading...
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="max-w-3xl mx-auto min-h-screen px-4 py-12 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Project not found</h2>
        <p className="text-sm text-slate-500">Projectsに存在しないIDです。</p>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 py-2 px-4 rounded-xl shadow-sm transition-colors"
        >
          ← Projectsへ戻る
        </Link>
      </main>
    );
  }

  const handleSavePomodoroSettings = () => {
    if (!project) return;

    const work = Number(workMinutesInput);
    const rest = Number(breakMinutesInput);

    const nextProjects = projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            pomodoroWorkMinutes:
              workMinutesInput.trim() && Number.isFinite(work) && work > 0
                ? work
                : undefined,
            pomodoroBreakMinutes:
              breakMinutesInput.trim() && Number.isFinite(rest) && rest > 0
                ? rest
                : undefined,
          }
        : p,
    );

    setProjects(nextProjects);
    saveProjectsIdb(nextProjects);
  };

  const handleSaveProjectMemo = () => {
    if (!project) return;

    const trimmed = projectMemoInput.trim();

    const nextProjects = projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            memo: trimmed ? trimmed : undefined,
          }
        : p,
    );

    setProjects(nextProjects);
    void saveProjectsIdb(nextProjects);
  };

  const handleSaveProjectName = () => {
    if (!project) return;

    const trimmed = projectNameInput.trim();
    if (!trimmed) return;

    const nextProjects = projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            name: trimmed,
          }
        : p,
    );

    setProjects(nextProjects);
    void saveProjectsIdb(nextProjects);
    setIsEditingName(false);
  };

  const targetMs = project.targetHours
    ? project.targetHours * 60 * 60 * 1000
    : null;
  const ratio = targetMs ? Math.min(1, totalMs / targetMs) : null;
  const percent = ratio != null ? Math.floor(ratio * 100) : null;
  const pomodoroWorkMinutes = project.pomodoroWorkMinutes ?? null;

  const estimatedPomodoroCount =
    pomodoroWorkMinutes && pomodoroWorkMinutes > 0
      ? Math.floor(totalMs / (pomodoroWorkMinutes * 60 * 1000))
      : null;

  return (
    <main className="max-w-3xl mx-auto min-h-screen px-4 py-8 space-y-6 font-sans text-slate-800 antialiased">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex-1 min-w-[240px]">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveProjectName();
                  if (e.key === "Escape") {
                    setProjectNameInput(project.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                className="text-2xl font-extrabold text-slate-900 bg-white border border-sky-500 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full"
              />
              <button
                onClick={handleSaveProjectName}
                className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-2 rounded-xl transition-colors shrink-0"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setProjectNameInput(project.name);
                  setIsEditingName(false);
                }}
                className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors shrink-0"
              >
                キャンセル
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {project.name}
              </h1>
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="プロジェクト名を変更"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 py-2 px-3.5 rounded-xl shadow-sm transition-colors"
          >
            ← 戻る
          </Link>
          <Link
            href={`/timer/${projectId}`}
            className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 py-2 px-4 rounded-xl shadow-sm transition-colors"
          >
            作業する
          </Link>
        </div>
      </div>

      {/* サマリー & 進捗 */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="block text-xs font-medium text-slate-500">コミット回数</span>
            <span className="text-xl font-bold text-slate-800">{commits.length} 回</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="block text-xs font-medium text-slate-500">累計時間</span>
            <span className="text-xl font-bold text-slate-800 tabular-nums">{formatMs(totalMs)}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
            <span className="block text-xs font-medium text-slate-500">納期</span>
            <span className="text-xl font-bold text-slate-800">
              {project.dueDate?.trim() ? project.dueDate : "未設定"}
            </span>
          </div>
        </div>

        {project.targetHours ? (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">
                進捗（目標 {project.targetHours}h）: {percent}%
              </span>
              <span className="text-slate-400 tabular-nums">
                ({formatMs(totalMs)} / {formatMs(project.targetHours * 60 * 60 * 1000)})
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* プロジェクトメモ */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-slate-900">プロジェクトメモ</h2>

        <textarea
          value={projectMemoInput}
          onChange={(e) => setProjectMemoInput(e.target.value)}
          rows={4}
          placeholder="このプロジェクトの方針・メモ・やることなど"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-y"
        />

        <div className="flex justify-end">
          <button
            onClick={handleSaveProjectMemo}
            className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            メモを保存
          </button>
        </div>
      </section>

      {/* ポモドーロ */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">ポモドーロ設定</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                作業時間（分）
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={workMinutesInput}
                onChange={(e) => setWorkMinutesInput(e.target.value)}
                placeholder="例: 25"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                休憩時間（分）
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={breakMinutesInput}
                onChange={(e) => setBreakMinutesInput(e.target.value)}
                placeholder="例: 5"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {project.pomodoroWorkMinutes ? (
                <span>
                  現在: <strong className="text-slate-700">{project.pomodoroWorkMinutes}分</strong> / 休憩{" "}
                  <strong className="text-slate-700">{project.pomodoroBreakMinutes ?? 5}分</strong>
                  {estimatedPomodoroCount != null && (
                    <span className="ml-2 text-sky-600 font-medium">
                      （完了目安: {estimatedPomodoroCount}回）
                    </span>
                  )}
                </span>
              ) : (
                <span>このプロジェクトにはポモドーロ設定がありません。</span>
              )}
            </div>

            <button
              onClick={handleSavePomodoroSettings}
              className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer ml-auto"
            >
              設定を保存
            </button>
          </div>
        </div>
      </section>

      {/* 履歴 */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">作業履歴</h2>

        {commits.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-slate-500 text-sm">
            まだコミットがありません。「作業する」からタイマーを回して Stop → 保存してね。
          </div>
        ) : (
          <ul className="grid gap-3 p-0 list-none">
            {commits.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/commits/${c.id}`}
                  className="block bg-white border border-slate-200 hover:border-sky-300 rounded-2xl p-4 shadow-sm hover:shadow transition-all group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                    <strong className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors tabular-nums">
                      {formatMs(c.durationMs)}
                    </strong>
                    <span>{new Date(c.endedAt).toLocaleString()}</span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {c.note?.trim() || "（メモなし）"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ギャラリー */}
      <section className="space-y-3 pt-2">
        <h2 className="text-base font-bold text-slate-900">Gallery</h2>
        {commitsWithImage.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-slate-500 text-sm">
            画像がまだありません（ここに進捗画像が並びます）
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {commitsWithImage.map((c) => {
              const url = imageUrls[c.id];

              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <Link href={`/commits/${c.id}`}>
                    {url ? (
                      <img
                        src={url}
                        alt="commit image"
                        className="w-full h-48 sm:h-56 object-cover rounded-lg border border-slate-100 hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-48 sm:h-56 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        Loading...
                      </div>
                    )}
                  </Link>

                  <div className="text-xs text-slate-400 mt-2 text-center font-medium">
                    {new Date(c.endedAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}