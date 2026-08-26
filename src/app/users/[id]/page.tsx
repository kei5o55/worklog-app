"use client";

import { useState, useMemo, useEffect, useRef, use } from "react";
import type { ChangeEvent } from "react";
import type { Project, Commit, WorkSession, User } from "../../../logic/types";
import TotalStatsCard from "../../../components/TotalStatsCard";
import UserProfileModal from "../../../components/UserProfileModal";
import Link from "next/link";
import { localUser } from "../../../logic/types";
import {
  loadProjectsIdb,
  loadCommitsIdb,
  loadSessionsIdb,
  loadUserProfileIdb,
  saveUserProfileIdb,
} from "../../../logic/storage-idb";

const CURRENT_LOGGED_IN_USER_ID = "1";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userIdFromParams } = use(params);

  // 自分のプロフィールかどうか
  const isMe = CURRENT_LOGGED_IN_USER_ID === userIdFromParams;

  // 1. localUser から対象のユーザーを検索
  const targetUser = useMemo(() => {
    return localUser.find((u) => u.id === userIdFromParams);
  }, [userIdFromParams]);

  // 2. targetUser を初期値にして state を作成
  const [user, setUserProfile] = useState<User | undefined>(targetUser);
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [sessionsAll, setSessionsAll] = useState<WorkSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // 編集用state
  const [isEditingName, setIsEditingName] = useState(false);
  const [userNameInput, setUserNameInput] = useState<string>("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // データ取得処理
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

    // 自分のページを見ている場合のみ IndexedDB のプロフィールを適用
    if (isMe && nextUser) {
      setUserProfile(nextUser);
    }
  };

  // URLの userIdFromParams が変更されたら state を再同期＆データ読み込み
  useEffect(() => {
    setUserProfile(targetUser);
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [userIdFromParams, targetUser]);

  // インライン名前編集の開始
  const handleStartEditingName = () => {
    if (!user) return;
    setUserNameInput(user.name);
    setIsEditingName(true);
  };

  // インライン名前編集の保存
  const handleUserNameChange = async () => {
    if (!user || !userNameInput.trim()) return;
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
    if (!file || !user) return;

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

  // ユーザーが見つからない場合の表示
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center text-slate-400 font-medium space-y-4">
        <p>ユーザーが見つかりませんでした。</p>
        <Link
          href="/"
          className="inline-block text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 py-2 px-3.5 rounded-xl shadow-sm transition-colors"
        >
          ← トップへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 bg-slate-50 min-h-screen text-slate-800">
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
          {isMe && (
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleIconChange}
              accept="image/*"
              className="hidden"
            />
          )}

          <div
            onClick={() => isMe && fileInputRef.current?.click()}
            className={`relative group shrink-0 ${isMe ? "cursor-pointer" : ""}`}
            title={isMe ? "アイコン画像を変更" : undefined}
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

            {isMe && (
              <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {isMe && isEditingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  className="text-2xl font-extrabold text-slate-900 bg-white border border-sky-500 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full"
                />
                <button
                  onClick={handleUserNameChange}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  保存
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group mb-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 truncate">
                  {user.name}
                </h1>
                {isMe && (
                  <button
                    onClick={handleStartEditingName}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="ユーザー名を変更"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-slate-500 line-clamp-2">{user.bio}</p>
          </div>

          {isMe && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              編集
            </button>
          )}
        </div>
      </header>

      <TotalStatsCard commits={commitsAll} projects={projects} />

      {isMe && (
        <UserProfileModal
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          currentUser={user}
          onSuccess={(updated) => {
            setUserProfile(updated);
            setIsEditOpen(false);
          }}
        />
      )}
    </div>
  );
}