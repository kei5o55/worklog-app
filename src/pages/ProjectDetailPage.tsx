//src/pages/ProjectDetailPage.tsx
//　今はidbからデータを取ってくる。projectpageはまだlocalstorageのままなので、今後両方ともidbにする予定
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { loadProjectsIdb, loadCommitsIdb,saveProjectsIdb } from "../logic/storage-idb";
//import { loadProjects, loadCommits, saveProjects, } from "../logic/storage";
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [commitsAll, setCommitsAll] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [workMinutesInput, setWorkMinutesInput] = useState("");
  const [breakMinutesInput, setBreakMinutesInput] = useState("");

  /*const refresh = () => {
    setProjects(loadProjects());
    setCommitsAll(loadCommits());
  };*/

  const refresh = async () => {// idb版のリフレッシュ関数。ProjectsPageの方もこれに合わせて書き換える予定
    const [nextProjects, nextCommits] = await Promise.all([
      loadProjectsIdb(),
      loadCommitsIdb(),
    ]);

    setProjects(nextProjects);
    setCommitsAll(nextCommits);
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {// idb版のリフレッシュ関数に合わせて書き換え
    const onFocus = () => {
      void refresh();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  
    const project = useMemo(() => {
      if (!projectId) return null;
      return projects.find((p) => p.id === projectId) ?? null;
    }, [projects, projectId]);

    useEffect(() => {
      if (!project) return;
      setWorkMinutesInput(
        project.pomodoroWorkMinutes ? String(project.pomodoroWorkMinutes) : ""
      );
      setBreakMinutesInput(
        project.pomodoroBreakMinutes ? String(project.pomodoroBreakMinutes) : ""
      );
    }, [project]);

    const commits = useMemo(() => {
      if (!projectId) return [];
      return commitsAll
        .filter((c) => c.projectId === projectId)
        .sort((a, b) => b.endedAt - a.endedAt);
    }, [commitsAll, projectId]);

    const commitsWithImage = useMemo(() => {
      return commits.filter((c) => c.image?.blob);
    }, [commits]);

    const totalMs = useMemo(() => commits.reduce((sum, c) => sum + c.durationMs, 0), [commits]);
    
    if (!projectId) {
      return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
          <h2>Project not found</h2>
          <Link to="/projects">Projectsへ戻る</Link>
        </main>
      );
    }

    if (loading) {
      return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
          <p>Loading...</p>
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



  const handleSavePomodoroSettings = () => {
    if (!project) return;

    const work = Number(workMinutesInput);
    const rest = Number(breakMinutesInput);

    const nextProjects = projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            pomodoroWorkMinutes:
              workMinutesInput.trim() && Number.isFinite(work) && work > 0
                ? work
                : undefined,
            pomodoroBreakMinutes:
              breakMinutesInput.trim() && Number.isFinite(rest) && rest > 0
                ? rest
                : undefined,
          }
        : p
    );

    setProjects(nextProjects);
    saveProjectsIdb(nextProjects);
  };

    
    const targetMs = project.targetHours ? project.targetHours * 60 * 60 * 1000 : null;
    const ratio = targetMs ? Math.min(1, totalMs / targetMs) : null;
    const percent = ratio != null ? Math.floor(ratio * 100) : null;
    const pomodoroWorkMinutes = project.pomodoroWorkMinutes ?? null;
    const pomodoroBreakMinutes = project.pomodoroBreakMinutes ?? null;
    

    const estimatedPomodoroCount =
      pomodoroWorkMinutes && pomodoroWorkMinutes > 0
        ? Math.floor(totalMs / (pomodoroWorkMinutes * 60 * 1000))
        : null;

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
        <h2 style={{ fontSize: 16 }}>作業履歴</h2>

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
    
    <section style={{ marginTop: 16 }}>
        {project.targetHours ? (
            <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, marginBottom: 4, color: "#555" }}>
                進捗（目標 {project.targetHours}h）：{percent}%
                <span style={{ marginLeft: 8, color: "#777" }}>
                    ({formatMs(totalMs)} / {formatMs(project.targetHours * 60 * 60 * 1000)})
                </span>
                </div>

                <div style={{ height: 12, background: "#eee", borderRadius: 999, overflow: "hidden" }}>
                <div
                    style={{
                    height: "100%",
                    width: `${percent}%`,
                    background: "#4f8cff",
                    transition: "width 0.25s",
                    }}
                />
                </div>
            </div>
        ) : null}
    </section>
    <h2 style={{ fontSize: 16, marginTop: 0 }}>ポモドーロ</h2>
    <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
            作業時間（分）
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={workMinutesInput}
            onChange={(e) => setWorkMinutesInput(e.target.value)}
            style={{ width: 160, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
            休憩時間（分）
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={breakMinutesInput}
            onChange={(e) => setBreakMinutesInput(e.target.value)}
            style={{ width: 160, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleSavePomodoroSettings}
            style={{ padding: "8px 12px", borderRadius: 10 }}
          >
            保存
          </button>

          {project.pomodoroWorkMinutes ? (
            <span style={{ fontSize: 12, color: "#666" }}>
              現在: {project.pomodoroWorkMinutes}分 / 休憩 {project.pomodoroBreakMinutes ?? 5}分
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#777" }}>
              このプロジェクトにはポモドーロ設定がありません。
            </span>
          )}
        </div>

        {project.pomodoroWorkMinutes ? (
          <div style={{ fontSize: 13, color: "#555" }}>
            完了ポモドーロ目安：{estimatedPomodoroCount ?? 0}回
          </div>
        ) : null}
      </div>
    </section>
      {/* 下：ギャラリー（仮） */}
        <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 16 }}>Gallery（仮）</h2>
              {commitsWithImage.length === 0 ? (
                <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 16, color: "#777" }}>
                  画像がまだありません（ここに進捗画像が並びます）
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: 10,
                  }}
                >
                  {commitsWithImage.map((c) => {
                    const url = URL.createObjectURL(c.image!.blob);

                    return (
                      <div
                        key={c.id}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 10,
                          padding: 6,
                        }}
                      >
                        <Link to={`/projects/${projectId}/commits/${c.id}`}>
                          <img
                            src={url}
                            alt="commit image"
                            style={{
                              width: "100%",
                              height: 100,
                              objectFit: "cover",
                              borderRadius: 6,
                              display: "block",
                            }}
                          />
                        </Link>

                        <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                          {new Date(c.endedAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </section>
    
    </main>
    );
}