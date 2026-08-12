// app/commits/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  loadCommitsIdb,
  loadProjectsIdb,
  saveCommitsIdb,
} from "../../../logic/storage-idb";
import type { Commit, Project } from "../../../logic/types";

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

export default function CommitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const commitId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // 編集用 State
  const [noteInput, setNoteInput] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      const [nextCommits, nextProjects] = await Promise.all([
        loadCommitsIdb(),
        loadProjectsIdb(),
      ]);
      setCommits(nextCommits);
      setProjects(nextProjects);
    } catch (error) {
      console.error("データの読み込みに失敗しました:", error);
    }
  };

  // 初回ロード & bfcache (戻る・進む) 対策
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setLoading(true);
        await refreshData();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void init();

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        void init();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      isMounted = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const commit = useMemo(() => {
    return commits.find((c) => c.id === commitId) ?? null;
  }, [commits, commitId]);

  const project = useMemo(() => {
    if (!commit) return null;
    return projects.find((p) => p.id === commit.projectId) ?? null;
  }, [projects, commit]);

  useEffect(() => {
    if (!commit) return;

    setNoteInput(commit.note ?? "");

    if (commit.image?.blob) {
      const url = URL.createObjectURL(commit.image.blob);
      setImageUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImageUrl(null);
    }
  }, [commit]);

  const handleSaveNote = async () => {
    if (!commit) return;

    const nextCommits = commits.map((c) =>
      c.id === commit.id ? { ...c, note: noteInput.trim() } : c
    );

    setCommits(nextCommits);
    await saveCommitsIdb(nextCommits);
    setIsEditingNote(false);
  };

  const handleDeleteCommit = async () => {
    if (!commit) return;
    if (!window.confirm("このコミットを削除しますか？")) return;

    const nextCommits = commits.filter((c) => c.id !== commit.id);
    await saveCommitsIdb(nextCommits);

    // 削除後は /project/[id] (単数形) か トップへリダイレクト
    if (project) {
      router.push(`/project/${project.id}`);
    } else {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto min-h-screen p-6 text-slate-900 flex items-center justify-center">
        <div className="p-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-slate-400 font-medium text-sm">
          コミット情報を読み込み中...
        </div>
      </main>
    );
  }

  if (!commit) {
    return (
      <main className="max-w-2xl mx-auto min-h-screen p-6 text-slate-900 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          コミットが見つかりませんでした
        </h2>
        <p className="text-sm text-slate-500">
          削除されたか、存在しないIDです。
        </p>
        <div>
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center text-sm font-semibold text-sky-600 hover:text-sky-700 hover:underline"
          >
            ← トップページへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto min-h-screen px-4 py-8 space-y-6 font-sans text-slate-800 antialiased">
      {/* ナビゲーション */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          href={project ? `/project/${project.id}` : "/"}
          prefetch={false}
          className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 py-2 px-3.5 rounded-xl shadow-sm transition-colors"
        >
          ← {project ? `${project.name} へ戻る` : "戻る"}
        </Link>

        <button
          onClick={handleDeleteCommit}
          className="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 py-2 px-3.5 rounded-xl transition-colors cursor-pointer"
        >
          コミットを削除
        </button>
      </div>

      {/* メイン詳細カード */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">
            {project?.name ?? "Unknown Project"}
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {formatMs(commit.durationMs)}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            完了日時: {new Date(commit.endedAt).toLocaleString()}
          </p>
        </div>

        {/* 作業メモ */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">作業メモ</h2>
            {!isEditingNote && (
              <button
                onClick={() => setIsEditingNote(true)}
                className="text-xs text-sky-600 hover:underline font-medium"
              >
                編集
              </button>
            )}
          </div>

          {isEditingNote ? (
            <div className="space-y-3">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-y"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingNote(false)}
                  className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveNote}
                  className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {commit.note?.trim() || "（メモなし）"}
            </p>
          )}
        </div>

        {/* 添付画像 */}
        {imageUrl && (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-bold text-slate-900">進捗画像</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={imageUrl}
                alt="Commit attachments"
                className="w-full h-auto max-h-[500px] object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}