//src/pages/ProjectDetailPage.tsx
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { loadProjects, loadCommits } from "../logic/storage";
import type { Project, Commit } from "../logic/types";

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

export default function ProjectDetailPage() {
  const { projectId } = useParams();

  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [commitsAll, setCommitsAll] = useState<Commit[]>(() => loadCommits());

  const refresh = () => {
    setProjects(loadProjects());
    setCommitsAll(loadCommits());
  };

  // Timerから戻ってきた直後も反映されやすくする
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const project = useMemo(() => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId) ?? null;
  }, [projects, projectId]);

  const commits = useMemo(() => {
    if (!projectId) return [];
    return commitsAll
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.endedAt - a.endedAt);
  }, [commitsAll, projectId]);

  const totalMs = useMemo(() => commits.reduce((sum, c) => sum + c.durationMs, 0), [commits]);

  if (!projectId) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <h2>Project not found</h2>
        <Link to="/projects">Projectsへ戻る</Link>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <h2>Project not found</h2>
        <p style={{ color: "#666" }}>Projectsに存在しないIDです。</p>
        <Link to="/projects">Projectsへ戻る</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>{project.name}</h1>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={refresh} style={{ padding: "6px 10px", borderRadius: 10 }}>
            更新
          </button>
          <Link to={`/projects/${projectId}/timer`}>作業する</Link>
        </div>
      </div>

      {/* 上：サマリー */}
      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div>コミット回数：{commits.length}</div>
        <div>累計時間：{formatMs(totalMs)}</div>
        {project.dueDate?.trim() ? <div>納期：{project.dueDate}</div> : null}
        {project.memo?.trim() ? (
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{project.memo}</div>
        ) : null}
      </section>

      {/* 中：履歴 */}
      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>履歴</h2>

        {commits.length === 0 ? (
          <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 16, color: "#777" }}>
            まだコミットがありません。「作業する」からタイマーを回して Stop → 保存してね。
          </div>
        ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10,cursor: "pointer",transition: "background 0.15s" }}>
            {commits.map((c) => (
                <li key={c.id}>
                <Link
                    to={`/projects/${projectId}/commits/${c.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                >
                    <div
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: 12,
                        padding: 12,
                    }}
                    >
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatMs(c.durationMs)}
                        </strong>
                        <span style={{ fontSize: 12, color: "#666" }}>
                        {new Date(c.endedAt).toLocaleString()}
                        </span>
                    </div>

                    <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                        {c.note?.trim() || "（メモなし）"}
                    </p>
                    </div>
                </Link>
                </li>
            ))}
        </ul>
        )}
      </section>

      {/* 下：ギャラリー（仮） */}
      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 16 }}>Gallery（仮）</h2>
        <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 16, color: "#777" }}>
          画像がまだありません（ここに進捗画像が並びます）
        </div>
      </section>
    </main>
  );
}