"use client";

import { useState, useMemo, useEffect, useRef,  } from "react";
import type { ChangeEvent } from "react";
import type { Project, Commit, WorkSession, User } from "../../logic/types";
import TotalStatsCard from "../../components/TotalStatsCard";
import UserProfileModal from "../../components/UserProfileModal";
import ArtLightbox from "../../components/ArtLightbox";
import Link from "next/link";
import {
  loadProjectsIdb,
  loadCommitsIdb,
  loadSessionsIdb,
  loadUserProfileIdb,
  saveUserProfileIdb,
} from "../../logic/storage-idb";

// 初期ユーザーデータ
export const initialUser: User = {
  id: "usr_01HGB8Z9K1M3N4P5Q6R7S8T9U0",
  name: "test user",
  icon: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  bio: "ReactとTypeScriptで個人開発中",
  bgmUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
  createdAt: 1704067200000, // 2024-01-01T00:00:00.000Z
  updatedAt: 1709251200000, // 2024-03-01T00:00:00.000Z
};

export default function UserProfilePage() {
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [sessionsAll, setSessionsAll] = useState<WorkSession[]>([]);
  const [user, setUserProfile] = useState<User>(initialUser);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // 簡易名前編集用state
  const [isEditingName, setIsEditingName] = useState(false);
  const [userNameInput, setUserNameInput] = useState<string>("");

  // プロフィール編集モーダル用state
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Blob画像のURLキャッシュ
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>({});

  // ファイル選択用の ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [nextProjects, nextCommits, nextSessions, nextUser] = await Promise.all([
      loadProjectsIdb(),
      loadCommitsIdb(),
      loadSessionsIdb(),
      loadUserProfileIdb(),
    ]);

    setProjects(nextProjects);
    setCommitsAll(nextCommits);
    setSessionsAll(nextSessions);
    if (nextUser) {
      setUserProfile(nextUser);
    }
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

  // インライン名前編集の開始
  const handleStartEditingName = () => {
    setUserNameInput(user.name);
    setIsEditingName(true);
  };

  // インライン名前編集の保存
  const handleUserNameChange = async () => {
    if (!userNameInput.trim()) return;
    const updatedUser: User = {
      ...user,
      name: userNameInput.trim(),
      updatedAt: Date.now(),
    };

    setUserProfile(updatedUser);
    await saveUserProfileIdb(updatedUser);
    setIsEditingName(false);
  };

  // アイコン画像のアップロード処理
  const handleIconChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルを Data URL (Base64) に変換
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const updatedUser: User = {
        ...user,
        icon: result,
        updatedAt: Date.now(),
      };
      setUserProfile(updatedUser);
      await saveUserProfileIdb(updatedUser);
    };
    reader.readAsDataURL(file);
  };

  // 完了済みプロジェクトの抽出
  const completedProjects = useMemo(() => {
    return projects.filter((p) => p.completed);
  }, [projects]);

  // 各プロジェクトの最新の画像付きコミットを抽出
  const latestCommits = useMemo(() => {
    const map = new Map<string, Commit>();
    for (const commit of commitsAll) {
      const existing = map.get(commit.projectId);
      if (
        !existing ||
        (commit.endedAt > existing.endedAt && commit.image)
      ) {
        map.set(commit.projectId, commit);
      }
    }
    return Array.from(map.values());
  }, [commitsAll]);

  // 完了済みプロジェクトかつ画像付きのコミット（最新順）
  const imageCommits = useMemo(() => {
    return latestCommits
      .filter((c) => c.image?.blob)
      .filter((c) => completedProjects.some((p) => p.id === c.projectId))
      .sort((a, b) => b.endedAt - a.endedAt);
  }, [latestCommits, completedProjects]);

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
        <div className="flex items-center gap-4 flex-1">
          {/* 隠し input[type="file"] */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleIconChange}
            accept="image/*"
            className="hidden"
          />

          {/* アイコン選択エリア */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer shrink-0"
            title="アイコン画像を変更"
          >
            {user.icon ? (
              <img
                src={user.icon}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover shadow-md border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                {user.name ? user.name.charAt(0).toUpperCase() : "K"}
              </div>
            )}

            {/* ホバー時にカメラアイコンのオーバーレイ表示 */}
            <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUserNameChange();
                    if (e.key === "Escape") {
                      setUserNameInput(user.name);
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  className="text-2xl font-extrabold text-slate-900 bg-white border border-sky-500 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full"
                />
                <button
                  onClick={handleUserNameChange}
                  className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setUserNameInput(user.name);
                    setIsEditingName(false);
                  }}
                  className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group mb-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 truncate">
                  {user.name}
                </h1>
                <button
                  onClick={handleStartEditingName}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="ユーザー名を変更"
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
            <p className="text-sm text-slate-500 line-clamp-2">{user.bio}</p>
          </div>

          <button
            onClick={() => setIsEditOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            編集
          </button>
        </div>

        {/* 作業BGM入力 / リンク表示 */}
        <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            🎵 作業用BGM / メモ
          </span>
          {user.bgmUrl ? (
            <a
              href={user.bgmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-600 hover:underline block truncate font-medium"
            >
              ▶ BGMを開く: {user.bgmUrl}
            </a>
          ) : (
            <span className="text-xs text-slate-400 block">
              BGM URLが設定されていません
            </span>
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
                <li key={project.id}>
                  {/* Link に flex やパディングなどのスタイルをまとめて移す */}
                  <Link
                    href={`/project/${project.id}`}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 transition-colors duration-150"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-sm font-semibold text-slate-800 block truncate">
                        {project.name}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 右側: 保存した進捗画像ギャラリー */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🖼️</span> 完成進捗ギャラリー
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
                    className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-sm flex flex-col justify-end"
                  >
                    {imageUrl && (
                      /*<img
                        src={imageUrl}
                        alt={commit.note || "進捗画像"}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90 group-hover:opacity-100"
                      />*/
                      <ArtLightbox src={imageUrl} alt={commit.note||"進捗画像"}/>
                    )}
                    

                    <div className="relative z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-2.5 text-white space-y-1">
                      <span className="text-[10px] text-sky-300 font-medium truncate block">
                        {project?.name || "プロジェクト"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ユーザープロフィール編集モーダル */}
        <UserProfileModal
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          currentUser={user}
          onSuccess={(updated) => {
            setUserProfile(updated);
            setIsEditOpen(false);
          }}
        />
      </div>
    </div>
  );
}