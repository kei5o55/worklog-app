"use client";

import Link from "next/link";
import { useParams } from "next/navigation"; // Pages Routerの場合は `import { useRouter } from "next/router";` に変更
import { useEffect, useMemo, useState } from "react";
import { loadProjectsIdb, loadCommitsIdb } from "../../..//logic/storage-idb";
import type { Project, Commit } from "../../..//logic/types";

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

export default function CommitDetailPage() {
  // ディレクトリ構造に合わせて `commitId` または `id` を取得
  const params = useParams();
  const commitId = (params?.commitId ?? params?.id) as string | undefined;

  /* Pages Router (next/router) の場合は以下に差し替え
  const router = useRouter();
  const commitId = (router.query.commitId ?? router.query.id) as string | undefined;
  */

  const [projects, setProjects] = useState<Project[]>([]);
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [loadedProjects, loadedCommits] = await Promise.all([
          loadProjectsIdb(),
          loadCommitsIdb(),
        ]);

        if (cancelled) return;

        setProjects(loadedProjects);
        setCommitsAll(loadedCommits);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  // commitId から該当のコミットを直接検索
  const commit = useMemo(() => {
    if (!commitId) return null;
    return commitsAll.find((c) => c.id === commitId) ?? null;
  }, [commitsAll, commitId]);

  // 見つかったコミットの projectId から親プロジェクトを検索
  const project = useMemo(() => {
    if (!commit) return null;
    return projects.find((p) => p.id === commit.projectId) ?? null;
  }, [projects, commit]);

  useEffect(() => {
    if (!commit?.image?.blob) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(commit.image.blob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [commit]);

  // ID未指定時
  if (!commitId) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-slate-900">
        <h2 className="text-lg font-bold">Not found</h2>
        <Link
          href="/projects"
          className="text-sm text-sky-600 hover:underline mt-2 inline-block"
        >
          Projects一覧へ
        </Link>
      </main>
    );
  }

  // 読み込み中
  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-slate-500 text-sm flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
        <span>読み込み中...</span>
      </main>
    );
  }

  // データ未存在時
  if (!commit) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-slate-900 space-y-3">
        <h2 className="text-lg font-bold">コミットが見つかりませんでした</h2>
        <div>
          <Link
            href="/projects"
            className="text-sm text-sky-600 hover:underline"
          >
            ← プロジェクト一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-5">
      {/* ナビゲーション・ヘッダー */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="text-xs font-semibold text-sky-600 tracking-wide uppercase">
            {project ? project.name : "Unknown Project"}
          </span>
          <h1 className="text-xl font-bold text-slate-900">コミット詳細</h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          {project ? (
            <Link
              href={`/projects/${project.id}`}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← プロジェクトへ戻る
            </Link>
          ) : (
            <Link
              href="/projects"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← 一覧へ戻る
            </Link>
          )}

          {project && (
            <Link
              href={`/projects/${project.id}/timer`}
              className="px-3.5 py-2 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-500 shadow-sm transition-all"
            >
              作業する
            </Link>
          )}
        </div>
      </div>

      {/* メインカード */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* 作業時間 & 記録日時 */}
        <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-slate-100 flex-wrap">
          <div>
            <span className="text-xs text-slate-400 block mb-1">作業時間</span>
            <strong className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatMs(commit.durationMs)}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block mb-1">記録日時</span>
            <span className="text-xs font-medium text-slate-600">
              {new Date(commit.endedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 開始〜終了時間表示 */}
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
          <span>
            <strong className="text-slate-500 font-medium">開始:</strong>{" "}
            {new Date(commit.startedAt).toLocaleString()}
          </span>
          <span>→</span>
          <span>
            <strong className="text-slate-500 font-medium">終了:</strong>{" "}
            {new Date(commit.endedAt).toLocaleString()}
          </span>
        </div>

        {/* メモ */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            メモ
          </h3>
          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
            {commit.note?.trim() ? (
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {commit.note}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">（メモなし）</p>
            )}
          </div>
        </div>

        {/* 添付画像 */}
        {commit.image && imageUrl && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              添付画像
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 max-w-lg">
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="block group"
              >
                <img
                  src={imageUrl}
                  alt={commit.image.name}
                  className="w-full h-auto object-cover cursor-zoom-in group-hover:opacity-95 transition-opacity"
                />
              </a>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {commit.image.name}
            </span>
          </div>
        )}

        {/* フッター情報 */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Commit ID: {commit.id}</span>
          {project && <span>Project ID: {project.id}</span>}
        </div>
      </section>
    </main>
  );
}