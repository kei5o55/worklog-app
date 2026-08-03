//src/app/Page.tsx
"use client"

import { useEffect, useMemo, useState } from "react";
import type { NewProjectInput } from "../components/CreateProjectModal";
import CreateProjectModal from "../components/CreateProjectModal";
import type { Project,Commit,WorkSession } from "../logic/types";
import ContributionHeatmap from "../components/ContributionHeatmap";
import CalendarBoard from "../components/CalendarBoard";
import {loadProjectsIdb,saveProjectsIdb,loadCommitsIdb,loadSessionsIdb,} from "../logic/storage-idb";//idb用

import Link from "next/link";



function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/*function normalizeProject(p: Project): Project {
  const due = p.dueDate?.trim() ? p.dueDate.trim() : undefined;
  const memo = p.memo?.trim() ? p.memo.trim() : undefined;
  return { ...p, dueDate: due, memo };
}*/

function daysUntil(dueDate: string) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  const now = Date.now();
  const diffMs = due - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function ProjectsPage() {

    const [projects, setProjects] = useState<Project[]>([]);
    const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    //const [selectedDate, setSelectedDate] = useState<string | null>(null);
    //const [newproject, setNewProject] = useState<Project | null>(null);
    const [sessionsAll, setSessionsAll] = useState<WorkSession[]>([]);
    
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
      // useEffectはブラウザでしか実行されないので、
      // ここを通ったということは「今はブラウザにいる」と確定できる
      setHasMounted(true);
    }, []);

    const testConnect = async () => {
      try {
        // Docker Railsの窓口URLに向けてデータを送信
        const response = await fetch("http://localhost:3001/api/v1/progress_logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            progress_log: {
              title: "WSL2の綺麗な環境からのテスト送信",
              status: "開通式リベンジ成功"
            }
          })
        });

        const data = await response.json();
        console.log("バックエンドからの返事:", data);
      } catch (error) {
        console.error("通信エラーが発生しました:", error);
      }
    };

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
    
    
    const sorted = useMemo(() => {
      const copy = [...projects];

      // 納期あり→近い順、納期なし→最後、同条件なら新しい順
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

    const latestCommitMap = useMemo(() => {
                  const map = new Map<string, Commit>();

                  for (const c of commitsAll) {
                    const prev = map.get(c.projectId);

                    // 画像付き優先
                    if (c.image?.blob) {
                      if (!prev || prev.endedAt < c.endedAt) {
                        map.set(c.projectId, c);
                      }
                    }
                  }

                  return map;
    }, [commitsAll]);

    function getImageUrl(commit: Commit) {
      if (!commit.image?.blob) return null;
      return URL.createObjectURL(commit.image.blob);
    }

  const onCreate = async (input: NewProjectInput) => {
    const name = input.name.trim();
    if (!name) return;

    const th = Number(input.targetHours);
    const targetHours =
      input.targetHours.trim() && Number.isFinite(th) && th > 0 ? th : undefined;

    const pwm = Number(input.pomodoroWorkMinutes);
    const pomodoroWorkMinutes =
      input.pomodoroWorkMinutes?.trim() &&
      Number.isFinite(pwm) &&
      pwm > 0
        ? pwm
        : undefined;

    const pbm = Number(input.pomodoroBreakMinutes);
    const pomodoroBreakMinutes =
      input.pomodoroBreakMinutes?.trim() &&
      Number.isFinite(pbm) &&
      pbm > 0
        ? pbm
        : undefined;

    const p: Project = {
      id: uid(),
      name,
      dueDate: input.dueDate?.trim() ? input.dueDate.trim() : undefined,
      memo: input.memo?.trim() ? input.memo.trim() : undefined,
      targetHours,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
      createdAt: Date.now(),
    };

    const nextProjects = [p, ...projects];
    setProjects(nextProjects);
    await saveProjectsIdb(nextProjects);
    setIsCreateOpen(false);
  };
  
  const onDelete = async (id: string) => {
    const target = projects.find((p) => p.id === id);
    const label = target ? `「${target.name}」` : "このプロジェクト";
    if (!confirm(`${label}を削除します。よろしいですか？`)) return;

    const nextProjects = projects.filter((p) => p.id !== id);
    setProjects(nextProjects);
    await saveProjectsIdb(nextProjects);
  };

    // まだブラウザでの準備ができていないなら、何も表示しない（またはLoadingを出す）
    if (!hasMounted) {
      return null; 
    }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Worklog</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          style={{ marginLeft: "auto", padding: "10px 14px", borderRadius: 10 }}
          className="border border-zinc-500 hover:bg-sky-100 py-2 px-4 font-bold cursor-pointer"
        >
          + 新規プロジェクト
        </button>
      </header>

      <p style={{ color: "#666", marginTop: 8 }}>
        ※ indexedDB に保存されます（リロードしても残る）
      </p>

      <section style={{ marginTop: 16 }}>
          {loading ? (
            <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 16, color: "#777" }}>
              Loading...
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 16, color: "#777" }}>
              まだプロジェクトがありません。「+ 新規プロジェクト」から作成。
            </div>
          ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {sorted.map((p) => {
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
                    style={{
                      border: "1px solid #b9b9b9",
                      background:"white",
                      borderRadius: 14,
                      padding: 14,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
                      {isRunning ? (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#e8f1ff",
                            border: "1px solid #4f8cff",
                            color: "#2f6fd6",
                          }}
                        >
                          作業中
                        </span>
                      ) : isPaused ? (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#f5f5f5",
                            border: "1px solid #bbb",
                            color: "#666",
                          }}
                        >
                          一時停止中
                        </span>
                      ) : null}
                    
                    {due ? (
                      <div style={{ fontSize: 12, color: "#666" }}>
                        納期: {due}
                        {remain != null && <span style={{ marginLeft: 8 }}>（あと{remain}日）</span>}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#999" }}>納期なし</div>
                    )}
                    {p.pomodoroWorkMinutes && p.pomodoroBreakMinutes ? (
                      <div style={{ fontSize: 12, color: "#666" }}>
                        ポモドーロ: {p.pomodoroWorkMinutes}分 / 休憩 {p.pomodoroBreakMinutes}分
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#999" }}>ポモドーロ未設定</div>
                    )}
                    <button
                      onClick={() => onDelete(p.id)}
                      style={{
                        marginLeft: "auto",
                        padding: "6px 10px",
                        borderRadius: 10,
                      }}
                      className="border border-zinc-500 hover:bg-sky-100 py-2 px-4 font-bold cursor-pointer"
                      title="削除"
                    >
                      削除
                    </button>
                  </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {p.memo ? (
                        <div style={{ color: "#333", whiteSpace: "pre-wrap" }}>{p.memo}</div>
                      ) : (
                        <div style={{ color: "#999" }}>（メモなし）</div>
                      )}
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt="latest commit"
                          style={{
                            maxHeight: 180,
                            marginLeft: "auto",
                            objectFit: "cover",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                          }}
                        />
                      ) : (
                        <div style={{ color: "#aaa", fontSize: 12 }}>
                          （画像なし）
                        </div>
                      )}
                    </div>
                  
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/project/${p.id}`} className="border border-zinc-500 hover:bg-sky-100 py-2 px-4 font-bold cursor-pointer rounded-lg">
                      詳細
                    </Link>
                    <Link href={`/timer/${p.id}`} className="border border-zinc-500 hover:bg-sky-100 py-2 px-4 font-bold cursor-pointer rounded-lg">
                      作業する
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <button className="border border-zinc-500 hover:bg-sky-100 py-2 px-4 font-bold cursor-pointer rounded-lg" onClick={testConnect}>テストボタン</button>

      <CreateProjectModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={onCreate} />
    
    <section>
        <CalendarBoard projectsFromParent={projects} />
    </section>
    
    <section style={{ marginTop: 12 }}>
        <ContributionHeatmap commits={commitsAll} title="All Activity" />
    </section>
    
    </main>
  );
}