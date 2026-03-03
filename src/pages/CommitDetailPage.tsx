// src/pages/CommitDetailPage.tsx
import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
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

export default function CommitDetailPage() {
  const { projectId, commitId } = useParams();

  const projects = useMemo<Project[]>(() => loadProjects(), []);
  const commitsAll = useMemo<Commit[]>(() => loadCommits(), []);

  const project = useMemo(() => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId) ?? null;
  }, [projects, projectId]);

  const commit = useMemo(() => {
    if (!projectId || !commitId) return null;
    return commitsAll.find((c) => c.id === commitId && c.projectId === projectId) ?? null;
  }, [commitsAll, projectId, commitId]);

  if (!projectId || !commitId) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <h2>Not found</h2>
        <Link to="/projects">Projectsへ</Link>
      </main>
    );
  }

  if (!project || !commit) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <h2>Commit not found</h2>
        <div style={{ marginTop: 8 }}>
          <Link to={`/projects/${projectId}`}>プロジェクト詳細へ戻る</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Commit Detail</h1>
        <div style={{ color: "#666", fontSize: 12 }}>{project.name}</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Link to={`/projects/${projectId}`}>← Project</Link>
          <Link to={`/projects/${projectId}/timer`}>作業する</Link>
        </div>
      </div>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
            {formatMs(commit.durationMs)}
          </strong>
          <span style={{ fontSize: 12, color: "#666" }}>
            {new Date(commit.endedAt).toLocaleString()}
          </span>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          {new Date(commit.startedAt).toLocaleString()} → {new Date(commit.endedAt).toLocaleString()}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>メモ</div>
          {commit.note?.trim() ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{commit.note}</div>
          ) : (
            <div style={{ color: "#999" }}>（メモなし）</div>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#888" }}>Commit ID: {commit.id}</div>
      </section>
    </main>
  );
}