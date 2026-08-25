"use client";

import { useState, useMemo, useEffect } from "react";
import type { Project, Commit, WorkSession,User } from "../../logic/types";
import TotalStatsCard from "../../components/TotalStatsCard";
import Link from "next/link";
import {
  loadProjectsIdb,
  loadCommitsIdb,
  loadSessionsIdb,
  saveProjectsIdb, // 追加: プロジェクト更新用
  saveCommitsIdb,  // 追加: コミット更新用（実装に合わせて変更してください）
} from "../../logic/storage-idb";

const BGM_STORAGE_KEY = "user_profile_bgm_url";

// 1. フル要素が揃っているユーザー
export const user: User = {
  id: "usr_01HGB8Z9K1M3N4P5Q6R7S8T9U0",
  name: "test user",
  icon: {
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    width: 150,
    height: 150,
  },
  bio: "ReactとTypeScriptで個人開発中",
  bgmUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
  createdAt: 1704067200000, // 2024-01-01T00:00:00.000Z
  updatedAt: 1709251200000, // 2024-03-01T00:00:00.000Z
};

export default function UserProfilePage() {
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [sessionsAll, setSessionsAll] = useState<WorkSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingName, setIsEditingName] = useState(false);

  const [UserNameInput,setUserNameInput] = useState<string>("");//名前用state
  const [UserBioInput,setUserBioInput] = useState<string>("");//bio用state

  // 作業BGM/メモのローカル管理
  const [bgmUrl, setBgmUrl] = useState<string>("");

  // メモ編集用の状態管理
  const [editingCommitId, setEditingCommitId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState<string>("");

  // Blob画像のURLキャッシュ
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

    // BGM URLの復元
    const savedBgm = localStorage.getItem(BGM_STORAGE_KEY);
    if (savedBgm) {
      setBgmUrl(savedBgm);
    }
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // BGM/メモの入力・保存
  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBgmUrl(val);
    localStorage.setItem(BGM_STORAGE_KEY, val);
  };

  const handleSaveUserName=()=>{
    console.log("test")
    setIsEditingName(false);
  };




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

  // BlobからのURL生成とクリーンアップ
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
                <div className="flex-1 min-w-[240px]">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={UserNameInput}
                            onChange={(e) => setUserNameInput(e.target.value)}
                            onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveUserName();
                            if (e.key === "Escape") {
                                setUserNameInput(user.name);
                                setIsEditingName(false);
                            }
                            }}
                            autoFocus
                            className="text-2xl font-extrabold text-slate-900 bg-white border border-sky-500 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full"
                        />
                        <button
                            onClick={handleSaveUserName}
                            className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-2 rounded-xl transition-colors shrink-0"
                        >
                            保存
                        </button>
                        <button
                            onClick={() => {
                            setUserNameInput(user.name);
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
                            {user.name}
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
            <p className="text-sm text-slate-500">{user.bio}</p>
          </div>
        </div>

        {/* 作業BGM入力（自動保存） */}
        <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            🎵 作業用BGM / メモ
          </span>
          <input
            type="url"
            placeholder="YouTube / Spotify等のURL"
            value={bgmUrl}
            onChange={handleBgmChange}
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
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-800 block truncate">
                      {project.name}
                    </span>
                  </div>
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
                const isEditing = editingCommitId === commit.id;

                return (
                  <div
                    key={commit.id}
                    className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-sm flex flex-col justify-end"
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={commit.note || "進捗画像"}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90 group-hover:opacity-100"
                      />
                    )}

                    <div className="relative z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-2.5 text-white space-y-1">
                      <span className="text-[10px] text-sky-300 font-medium truncate block">
                        {project?.name || "プロジェクト"}
                      </span>

                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-sky-400"
                            autoFocus
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => setEditingCommitId(null)}
                              className="text-[10px] px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs line-clamp-2 text-slate-200 flex-1">
                            {commit.note || "（メモなし）"}
                          </p>
                        </div>
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