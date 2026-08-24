"use client";

import { useState, useMemo, useEffect } from "react";
import type { Project, Commit, WorkSession } from "../../logic/types";
import TotalStatsCard from "../../components/TotalStatsCard";
import Link from "next/link";
import {
  loadProjectsIdb,
  loadCommitsIdb,
  loadSessionsIdb,
} from "../../logic/storage-idb";

export default function UserProfilePage() {
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [sessionsAll, setSessionsAll] = useState<WorkSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // 作業BGMリンクのローカル管理
  const [bgmUrl, setBgmUrl] = useState<string>("");

  // Blob画像のURLキャッシュ（メモリリーク防止用）
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>({});

  const refresh = async () => {
    const [nextProjects, nextCommits, nextSessions] = await Promise.all([
      loadProjectsIdb(),
      loadCommitsIdb(),
      loadSessionsIdb(),
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

  // 完了済みプロジェクトの抽出
  const completedProjects = useMemo(() => {
    return projects.filter((p) => p.completed);
  }, [projects]);

  // 画像付きコミットの抽出（最新順）
  const imageCommits = useMemo(() => {
    return commitsAll
      .filter((c) => c.image?.blob)
      .sort((a, b) => b.endedAt - a.endedAt);
  }, [commitsAll]);

  // BlobからのURL生成とクリーンアップ処理（メモリリーク防止）
  useEffect(() => {
    const newMap: Record<string, string> = {};
    imageCommits.forEach((commit) => {
      if (commit.image?.blob) {
        newMap[commit.id] = URL.createObjectURL(commit.image.blob);
      }
    });
    setImageUrlMap(newMap);

    return () => {
      Object.values(newMap).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageCommits]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center text-slate-400 font-medium">
        データを読み込んでいます...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 bg-slate-50 min-h-screen text-slate-800">
      {/* 戻るボタン & ユーザーヘッダー */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 py-2 px-3.5 rounded-xl shadow-sm transition-colors"
        >
          ← 戻る
        </Link>
      </div>

      <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            K
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Creator Profile</h1>
            <p className="text-sm text-slate-500">作業記録 & 進捗ギャラリー</p>
          </div>
        </div>

        {/* 作業BGM入力 */}
        <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            🎵 作業用BGM / メモ
          </span>
          <input
            type="url"
            placeholder="YouTube / Spotify等のURL"
            value={bgmUrl}
            onChange={(e) => setBgmUrl(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {bgmUrl && (
            <a
              href={bgmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-600 hover:underline block truncate font-medium"
            >
              ▶ BGMを開く: {bgmUrl}
            </a>
          )}
        </div>
      </header>

      {/* 統計カード */}
      <TotalStatsCard commits={commitsAll} projects={projects} />

      {/* 完了プロジェクト ＆ 進捗画像ギャラリー */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側: 完了済みプロジェクト一覧 */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="text-emerald-500">✓</span> 完了済みプロジェクト
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {completedProjects.length}
            </span>
          </h3>

          {completedProjects.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              完了したプロジェクトはまだありません。
            </p>
          ) : (
            <ul className="space-y-2.5">
              {completedProjects.map((project) => (
                <li
                  key={project.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-slate-800 block">
                      {project.name}
                    </span>
                    {project.dueDate && (
                      <span className="text-[11px] text-slate-400">
                        納期: {project.dueDate}
                      </span>
                    )}
                  </div>
                  <span
                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: project.color || "#3b82f6" }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 右側: 保存した進捗画像ギャラリー */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🖼️</span> 作業進捗ギャラリー
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {imageCommits.length}
            </span>
          </h3>

          {imageCommits.length === 0 ? (
            <div className="h-40 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
              画像付きのコミットがありません。
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {imageCommits.map((commit) => {
                const project = projects.find((p) => p.id === commit.projectId);
                const imageUrl = imageUrlMap[commit.id];

                return (
                  <div
                    key={commit.id}
                    className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-sm"
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={commit.note || "進捗画像"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90 group-hover:opacity-100"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-2.5 text-white flex flex-col justify-end">
                      <span className="text-[10px] text-sky-300 font-medium truncate">
                        {project?.name || "プロジェクト"}
                      </span>
                      {commit.note && (
                        <p className="text-xs line-clamp-1 text-slate-200">
                          {commit.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}