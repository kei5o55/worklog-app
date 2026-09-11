"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewProjectInput } from "../logic/api-types";
import CreateProjectModal from "../components/CreateProjectModal";
import type { Project, Commit, WorkSession } from "../logic/types";
import CalendarBoard from "../components/CalendarBoard";
import HealthCheckButton from "../components/HealthCheckButton";
import { DataMigrationButton } from "../components/MigrationButton";
import CommitModal, { type DraftCommit } from "../components/CommitModal"; 
import {
  loadProjectsIdb,
  saveProjectsIdb,
  loadCommitsIdb,
  loadSessionsIdb,
  deleteProjectDb,
  addCommitIdb, // ← 追加
} from "../logic/storage-idb";

const BASE_URL = 'http://localhost:3001';

import { loadProjects,createProject,loadCommits,createCommit,deleteProject,updateProject} from "../logic/api-request";

import Link from "next/link";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function daysUntil(dueDate: string) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  const now = Date.now();
  const diffMs = due - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// 今日（0:00以降）の累計時間を算出ヘルパー
function calcTodayTotalMs(commits: Commit[]): number {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  return commits
    .filter((c) => c.endedAt >= todayMs)
    .reduce((acc, c) => acc + (c.durationMs || 0), 0);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);

  // ダイレクトコミット用State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftCommit, setDraftCommit] = useState<DraftCommit | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sessionsAll, setSessionsAll] = useState<WorkSession[]>([]);
  const [hasMounted, setHasMounted] = useState(false);

  // 表示するタブ（active: 進行中, completed: 完了済み）
  const [activeTab, setActiveTab] = useState<"calender"|"active" | "completed">("active");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const refresh = async () => {
    // 環境変数によって呼び出す関数を切り替える
    const isApiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

    const [nextProjects, nextCommits, nextSessions] = await Promise.all([
      isApiMode ? loadProjects() : loadProjectsIdb(),
      isApiMode ? loadCommits() : loadCommitsIdb(),
      loadSessionsIdb(), // Sessions はモードに関わらず常に IndexedDB から取得
    ]);

    setProjects(nextProjects);
    setCommitsAll(nextCommits);
    setSessionsAll(nextSessions);
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // ダイレクトコミットモーダルを開く処理
  const handleOpenDirectCommit = (project: Project) => {
    const now = Date.now();
    const defaultMinutes = 30; // デフォルトで30分の作業としてセット

    // 該当プロジェクトのコミットのみ抽出
    const projectCommits = commitsAll.filter((c) => c.projectId === project.id);
    const todayMs = calcTodayTotalMs(projectCommits);
    const totalMs = projectCommits.reduce((acc, c) => acc + (c.durationMs || 0), 0);
    const recentNotes = projectCommits
      .map((c) => c.note)
      .filter((n): n is string => Boolean(n && n.trim()))
      .slice(-3);

    setTargetProjectId(project.id);
    setDraftCommit({
      projectId: project.id,
      projectName: project.name,
      endedAt: now,
      startedAt: now - defaultMinutes * 60 * 1000,
      note: "",
      commitNumber: projectCommits.length + 1,
      todayTotalMs: todayMs,
      projectTotalMs: totalMs,
      recentNotes: recentNotes,
      image: null,
    });

    setIsModalOpen(true);
  };

  const sorted = useMemo(() => {
    const copy = [...projects];

    copy.sort((a, b) => {
      const ad = a.dueDate?.trim() ? a.dueDate.trim() : "";
      const bd = b.dueDate?.trim() ? b.dueDate.trim() : "";

      if (ad && bd) return ad.localeCompare(bd);
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return b.createdAt - a.createdAt;
    });

    return copy;
  }, [projects]);

  // タブで「進行中」と「完了済み」を分類
  const filteredProjects = useMemo(() => {
    return sorted.filter((p) =>
      activeTab === "completed" ? p.completed : !p.completed
    );
  }, [sorted, activeTab]);

  // 件数カウント
  const counts = useMemo(() => {
    const completed = projects.filter((p) => p.completed).length;
    const active = projects.length - completed;
    return { active, completed };
  }, [projects]);

  const latestCommitMap = useMemo(() => {
    const map = new Map<string, Commit>();
    const isApiMode = process.env.NEXT_PUBLIC_API_MODE === 'true';

    for (const c of commitsAll) {
      // 画像が存在するかどうかをモードに応じて判定
      const hasImage = isApiMode
        ? typeof c.image === 'string' || Boolean(c.image?.blob)
        : Boolean(c.image?.blob);

      if (hasImage) {
        const prev = map.get(c.projectId);

        // 最新の endedAt を持つコミットに更新
        if (!prev || prev.endedAt < c.endedAt) {
          map.set(c.projectId, c);
        }
      }
    }

    return map;
  }, [commitsAll]);

  function getImageUrl(commit: Commit) {
    const isApiMode = process.env.NEXT_PUBLIC_API_MODE === 'true';

    // 1. Blob オブジェクトが存在する場合 (ローカル保存 / 新規選択時)
    if (commit.image?.blob) {
      return URL.createObjectURL(commit.image.blob);
    }

    // 2. APIモードかつ、c.image が文字列 (Rails からの画像パス) の場合
    if (isApiMode && typeof commit.image === 'string') {
      console.log(`${BASE_URL}/${commit.image}`);
      return `${BASE_URL}/${commit.image}`;
    }

    // 3. 画像が存在しない場合
    return null;
  }

  const onCreate = async (input: NewProjectInput) => {
    const name = input.name.trim();
    if (!name) return;

    // 数値項目のバリデーションとサニタイズ
    const targetHours =
      input.targetHours && Number.isFinite(input.targetHours) && input.targetHours > 0
        ? input.targetHours
        : undefined;

    const pomodoroWorkMinutes =
      input.pomodoroWorkMinutes && Number.isFinite(input.pomodoroWorkMinutes) && input.pomodoroWorkMinutes > 0
        ? input.pomodoroWorkMinutes
        : undefined;

    const pomodoroBreakMinutes =
      input.pomodoroBreakMinutes && Number.isFinite(input.pomodoroBreakMinutes) && input.pomodoroBreakMinutes > 0
        ? input.pomodoroBreakMinutes
        : undefined;

    // 整形済みの入力オブジェクトを作る
    const sanitizedInput: NewProjectInput = {
      ...input,
      name,
      dueDate: input.dueDate?.trim() || undefined,
      memo: input.memo?.trim() || undefined,
      targetHours,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
    };

    // 環境変数の判定（"true" という文字列かどうか）
    const isApiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

    if (isApiMode) {
      // 【API モード】Rails API へ送信して更新
      try {
        const created = await createProject(sanitizedInput);
        if (!created) {
          // API 側でバリデーションエラー等の場合はダイアログを閉じずに中断
          return;
        }
        const nextProjects = await loadProjects();
        setProjects(nextProjects);
        setIsCreateOpen(false);
      } catch (error) {
        console.error("プロジェクトの作成に失敗しました:", error);
      }
    } else {
      // 【ローカル/オフライン モード】IndexedDB へ保存
      const p: Project = {
        id: uid(),
        name,
        dueDate: sanitizedInput.dueDate,
        memo: sanitizedInput.memo,
        targetHours,
        pomodoroWorkMinutes,
        pomodoroBreakMinutes,
        completed: false,
        createdAt: Date.now(),
      };

      const nextProjects = [p, ...projects];
      setProjects(nextProjects);
      await saveProjectsIdb(nextProjects);
      setIsCreateOpen(false);
    }
  };

  // 完了状態の切り替え関数
  const onToggleComplete = async (project: Project) => {
    const nextStatus = !project.completed;
    const actionLabel = nextStatus ? "完了" : "未完了（進行中）に戻す";

    if (!confirm(`「${project.name}」を${actionLabel}状態に変更しますか？`)) {
      return;
    }

    const isApiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

    // 更新対象のプロジェクトオブジェクト
    const updatedTargetProject: Project = {
      ...project,
      completed: nextStatus,
    };

    // State の即時更新（楽観的UI更新）
    const nextProjects = projects.map((p) =>
      p.id === project.id ? updatedTargetProject : p
    );
    setProjects(nextProjects);

    if (isApiMode) {
      // 🌐 API モード: Rails バックエンドへ PATCH リクエスト送信
      //ここ、リクエストが二回送信されるからなんか上手くやりたいかも。（ドラフト作ってやるとか）
      const updated = await updateProject(updatedTargetProject);
      if (!updated) {
        alert("ステータスの更新に失敗しました");
        // 失敗した場合は元の状態に戻す (ロールバック)
        setProjects(projects);
      }
      const nexProjects = await loadProjects();

      setProjects(nexProjects);
    } else {
      // 💾 ローカルモード: IndexedDB に保存
      await saveProjectsIdb(nextProjects);
    }
  };

  const onDelete = async (id: string) => {
    const target = projects.find((p) => p.id === id);
    const label = target ? `「${target.name}」` : "このプロジェクト";
    if (!confirm(`${label}を削除します。よろしいですか？`)) return;

    const isApiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

    if (isApiMode) {
      // API モード: Rails バックエンドの DELETE /api/v1/projects/:id を実行
      const success = await deleteProject(id);

      if (success) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("プロジェクトの削除に失敗しました。時間をおいて再度お試しください。");
      }
    } else {
      // ⭕️ ローカルモード: IDB から指定 ID のみ削除（全消去の危険性を排除）
      await deleteProjectDb(id); // ← 作成した個別削除関数を呼ぶ
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (!hasMounted) {
    return null;
  }

  return (
    <main className="max-w-4xl mx-auto min-h-screen px-4 py-8 space-y-8 font-sans text-slate-800 antialiased">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            memomy
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            データはブラウザ（IndexedDB）にに保存されます
          </p>
          <p>現在のモード：{process.env.NEXT_PUBLIC_API_MODE}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 py-2 px-3.5 rounded-xl shadow-sm transition-colors"
          >
            ← userpageへ
          </Link>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span> 新規プロジェクト
          </button>
        </div>
      </header>

      {/* Projects List Header & Tabs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "active"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              進行中
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "active"
                    ? "bg-white text-sky-950"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "completed"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              完了済み
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "completed"
                    ? "bg-emerald-800 text-emerald-100"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {counts.completed}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("calender")} 
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "calender"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              カレンダー
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-slate-400 font-medium text-sm">
            データを読み込み中...
          </div>
        ) : activeTab === "calender" ? (
            <CalendarBoard></CalendarBoard>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50">
            <p className="text-slate-500 font-medium">
              {activeTab === "active"
                ? "進行中のプロジェクトはありません。"
                : "完了済みのプロジェクトはありません。"}
            </p>
            {activeTab === "active" && (
              <p className="text-xs text-slate-400 mt-1">
                右上の「+ 新規プロジェクト」ボタンから作成を始めましょう！
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((p) => {
              const due = p.dueDate?.trim() ? p.dueDate.trim() : "";
              const remain = due ? daysUntil(due) : null;
              const latest = latestCommitMap.get(p.id);
              const imageUrl = latest ? getImageUrl(latest) : null;
              const activeSession = sessionsAll.find(
                (s) => s.projectId === p.id && s.endedAt == null
              );
              const isRunning = activeSession?.status === "running";
              const isPaused = activeSession?.status === "paused";

              return (
                <article
                  key={p.id}
                  className={`group relative bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4 ${
                    p.completed
                      ? "border-slate-200 bg-slate-50/60 opacity-80 hover:opacity-100"
                      : "border-slate-200"
                  }`}
                >
                  {/* Top Bar: Name, Status & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2
                        className={`text-xl font-bold tracking-tight ${
                          p.completed
                            ? "line-through text-slate-500"
                            : "text-slate-900"
                        }`}
                      >
                        {p.name}
                      </h2>

                      {p.completed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ 完了
                        </span>
                      )}

                      {!p.completed && isRunning && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                          作業中
                        </span>
                      )}
                      {!p.completed && isPaused && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          一時停止中
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 cursor-pointer ml-auto sm:ml-0"
                      title="プロジェクトを削除"
                    >
                      削除
                    </button>
                  </div>

                  {/* Details Meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {due ? (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-600">
                          納期: {due}
                        </span>
                        {remain != null && !p.completed && (
                          <span
                            className={`font-semibold ${
                              remain < 0
                                ? "text-red-500"
                                : remain <= 3
                                ? "text-amber-600"
                                : "text-sky-600"
                            }`}
                          >
                            （{remain < 0 ? `${Math.abs(remain)}日超過` : `あと${remain}日`}）
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">納期なし</span>
                    )}

                    <span className="text-slate-300">•</span>

                    {p.pomodoroWorkMinutes && p.pomodoroBreakMinutes ? (
                      <span>
                        ポモドーロ: {p.pomodoroWorkMinutes}分 / 休憩 {p.pomodoroBreakMinutes}分
                      </span>
                    ) : (
                      <span className="text-slate-400">ポモドーロ未設定</span>
                    )}
                  </div>

                  {/* Main Content Area: Memo + Image */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                    <div className="flex-1 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {p.memo ? (
                        p.memo
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          （メモはありません）
                        </span>
                      )}
                    </div>

                    {imageUrl && (
                      <div className="shrink-0 w-full sm:w-auto">
                        <img
                          src={imageUrl}
                          alt="latest commit"
                          className="h-28 sm:h-32 w-full sm:w-48 object-cover rounded-xl border border-slate-200 shadow-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/project/${p.id}`}
                        className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
                      >
                        詳細を見る
                      </Link>
                      {!p.completed && (
                        <Link
                          href={`/timer/${p.id}`}
                          className="text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          作業をはじめる
                        </Link>
                      )}
                      {!p.completed && (
                        <button
                          onClick={() => handleOpenDirectCommit(p)} // ← onClick を設定
                          className="text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                        >
                          ダイレクトコミット
                        </button>
                      )}
                    </div>

                    {/* 完了 / 戻す ボタン */}
                    <button
                      onClick={() => onToggleComplete(p)}
                      className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        p.completed
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {p.completed ? (
                        <>↩ 未完了に戻す</>
                      ) : (
                        <>✓ 完了にする</>
                      )}
                    </button>
                  </div>
                </article>
              );
              
            })}
          </div>
        )}
      </section>

      <CreateProjectModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={onCreate}
        //onCreate={onCreate2}　//バックエンド連携の時はこっちにスイッチ
      />

      {/* ダイレクトコミットモーダル */}
      <CommitModal
        open={isModalOpen}
        mode="direct"
        draft={draftCommit}
        onChange={setDraftCommit}
        onCancel={() => {
          setIsModalOpen(false);
          setDraftCommit(null);
          setTargetProjectId(null);
        }}
        onSave={async () => {
          if (!draftCommit || !targetProjectId) return;

          const isApiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

          if (isApiMode) {
            // 【API モード】Rails API へ FormData 送信
            try {
              const created = await createCommit({
                projectId: targetProjectId,
                startedAt: draftCommit.startedAt,
                endedAt: draftCommit.endedAt,
                note: draftCommit.note,
                image: draftCommit.image
                  ? {
                      name: draftCommit.image.name,
                      type: draftCommit.image.type,
                      size: draftCommit.image.size,
                      blob: draftCommit.image.file,
                    }
                  : undefined,
              });

              if (!created) {
                // API保存が失敗（バリデーションエラー等）した場合はモーダルを閉じずに中断
                return;
              }
            } catch (error) {
              console.error("コミットの作成に失敗しました:", error);
              return;
            }
          } else {
            // 【ローカル/オフライン モード】IndexedDB へ保存
            await addCommitIdb({
              id: uid(),
              projectId: targetProjectId,
              startedAt: draftCommit.startedAt,
              endedAt: draftCommit.endedAt,
              durationMs: draftCommit.endedAt - draftCommit.startedAt,
              note: draftCommit.note,
              image: draftCommit.image
                ? {
                    name: draftCommit.image.name,
                    type: draftCommit.image.type,
                    size: draftCommit.image.size,
                    blob: draftCommit.image.file,
                  }
                : null,
            });
          }

          // クリーンアップとデータ再取得（共通処理）
          setIsModalOpen(false);
          setDraftCommit(null);
          setTargetProjectId(null);
          await refresh();
        }}
        onSaveAndContinue={() => {}}
      />

      {/* Calendar & Heatmap */}
      <div className="space-y-6 pt-4 border-t border-slate-200">
        {/*<section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <ContributionHeatmap commits={commitsAll} title="All Activity" />
        </section>*/}
        <HealthCheckButton></HealthCheckButton>
        <DataMigrationButton></DataMigrationButton>
      </div>
    </main>
  );
}