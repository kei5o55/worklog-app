// components/TotalStatsCard.tsx
"use client";

import { useMemo } from "react";
import type { Commit, Project } from "../logic/types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMsToDetailedString(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);

  if (h === 0) {
    return `${m}分`;
  }
  return `${h}時間 ${pad2(m)}分`;
}

interface TotalStatsCardProps {
  commits: Commit[];
  projects: Project[];
  loading?: boolean;
}

export default function TotalStatsCard({
  commits,
  projects,
  loading = false,
}: TotalStatsCardProps) {
  // 統計データの計算
  const stats = useMemo(() => {
    if (!commits.length) {
      return {
        totalMs: 0,
        totalCommits: 0,
        activeProjectsCount: 0,
        lastActiveDate: null,
        imageCommitsCount: 0,
      };
    }

    const totalMs = commits.reduce((sum, c) => sum + c.durationMs, 0);
    const totalCommits = commits.length;
    
    // コミットが存在するプロジェクトのID集合
    const activeProjectIds = new Set(commits.map((c) => c.projectId));
    
    // 画像付きコミット数
    const imageCommitsCount = commits.filter((c) => c.image?.blob).length;

    // 最終作業日
    const latestEndedAt = Math.max(...commits.map((c) => c.endedAt));
    const lastActiveDate = new Date(latestEndedAt).toLocaleDateString();

    return {
      totalMs,
      totalCommits,
      activeProjectsCount: activeProjectIds.size,
      lastActiveDate,
      imageCommitsCount,
    };
  }, [commits]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-16 bg-slate-100 rounded-xl"></div>
          <div className="h-16 bg-slate-100 rounded-xl"></div>
          <div className="h-16 bg-slate-100 rounded-xl"></div>
          <div className="h-16 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700/50 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div>
          <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
            Overall Analytics
          </span>
          <h2 className="text-lg font-bold text-slate-100">全体の作業実績</h2>
        </div>
        {stats.lastActiveDate && (
          <span className="text-xs text-slate-400 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full">
            最終作業: {stats.lastActiveDate}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* 総作業時間 */}
        <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
          <span className="text-xs font-medium text-slate-400 block">総作業時間</span>
          <span className="text-xl sm:text-2xl font-extrabold text-sky-400 tracking-tight">
            {formatMsToDetailedString(stats.totalMs)}
          </span>
        </div>

        {/* 総コミット数 */}
        <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
          <span className="text-xs font-medium text-slate-400 block">総ルーズリーフ数</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            {stats.totalCommits}{" "}
            <span className="text-xs font-normal text-slate-400">枚</span>
          </span>
        </div>

        {/* 稼働プロジェクト数 */}
        <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
          <span className="text-xs font-medium text-slate-400 block">稼働プロジェクト</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            {stats.activeProjectsCount}{" "}
            <span className="text-xs font-normal text-slate-400">/ {projects.length} 個</span>
          </span>
        </div>

        {/* 進捗ギャラリー（画像付きコミット） */}
        <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
          <span className="text-xs font-medium text-slate-400 block">保存した進捗画像</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight">
            {stats.imageCommitsCount}{" "}
            <span className="text-xs font-normal text-slate-400">枚</span>
          </span>
        </div>
      </div>
    </section>
  );
}