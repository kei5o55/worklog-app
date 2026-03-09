//src/pages/ProjectsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { NewProjectInput } from "../components/CreateProjectModal";
import CreateProjectModal from "../components/CreateProjectModal";
import { loadProjects, saveProjects, clearProjects,} from "../logic/storage";
import type { Project } from "../logic/types";
import ContributionHeatmap from "../components/ContributionHeatmap";
import { loadCommits } from "../logic/storage";
import ScheduleCalendar from "../components/ScheduleCalendar";
import CalendarPage from "./CalendarPage";



function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeProject(p: Project): Project {
  const due = p.dueDate?.trim() ? p.dueDate.trim() : undefined;
  const memo = p.memo?.trim() ? p.memo.trim() : undefined;
  return { ...p, dueDate: due, memo };
}

function daysUntil(dueDate: string) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  const now = Date.now();
  const diffMs = due - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function ProjectsPage() {

    const [projects, setProjects] = useState<Project[]>(() => {
        const loaded = loadProjects();
        if (loaded.length > 0) return loaded;
        return [
            {
            id: "p1",
            name: "NARAKU",
            memo: "仮プロジェクト（後で消してOK）",
            createdAt: Date.now(),
            },
        ];
        });

        useEffect(() => {
        saveProjects(projects);
    }, [projects]);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    

    // 変更のたびに永続化
    useEffect(() => {
        saveProjects(projects);
    }, [projects]);

    useState(() => loadProjects());

    const [commitsAll, setCommitsAll] = useState(() => loadCommits());
    useEffect(() => {
        const onFocus = () => setCommitsAll(loadCommits());
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

  const onCreate = (input: NewProjectInput) => {
    const name = input.name.trim();
    if (!name) return;
    const th = Number(input.targetHours);
    const targetHours =input.targetHours.trim() && Number.isFinite(th) && th > 0 ? th : undefined;

    const p: Project = {
        id: uid(),
        name,
        dueDate: input.dueDate?.trim() ? input.dueDate.trim() : undefined,
        memo: input.memo?.trim() ? input.memo.trim() : undefined,
        targetHours,
        createdAt: Date.now(),
    };

    setProjects((prev) => [p, ...prev]);
    setIsCreateOpen(false);
  };

  const onDelete = (id: string) => {
    // 表示ラベルだけ先に確定
    const target = projects.find((p) => p.id === id);
    const label = target ? `「${target.name}」` : "このプロジェクト";
    if (!confirm(`${label}を削除します。よろしいですか？`)) return;

    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Worklog</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          style={{ marginLeft: "auto", padding: "10px 14px", borderRadius: 10 }}
        >
          + 新規プロジェクト
        </button>
      </header>

      <p style={{ color: "#666", marginTop: 8 }}>
        ※ localStorage に保存されます（リロードしても残る）
      </p>

      <section style={{ marginTop: 16 }}>
        {sorted.length === 0 ? (
          <div style={{ border: "1px dashed #bbb", borderRadius: 12, padding: 16, color: "#777" }}>
            まだプロジェクトがありません。「+ 新規プロジェクト」から作成。
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {sorted.map((p) => {
              const due = p.dueDate?.trim() ? p.dueDate.trim() : "";
              const remain = due ? daysUntil(due) : null;

              return (
                <article
                  key={p.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 14,
                    padding: 14,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>

                    {due ? (
                      <div style={{ fontSize: 12, color: "#666" }}>
                        納期: {due}
                        {remain != null && <span style={{ marginLeft: 8 }}>（あと{remain}日）</span>}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#999" }}>納期なし</div>
                    )}

                    <button
                      onClick={() => onDelete(p.id)}
                      style={{
                        marginLeft: "auto",
                        padding: "6px 10px",
                        borderRadius: 10,
                      }}
                      title="削除"
                    >
                      削除
                    </button>
                  </div>

                  {p.memo ? (
                    <div style={{ color: "#333", whiteSpace: "pre-wrap" }}>{p.memo}</div>
                  ) : (
                    <div style={{ color: "#999" }}>（メモなし）</div>
                  )}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link to={`/projects/${p.id}`} style={{ padding: "8px 10px" }}>
                      詳細
                    </Link>
                    <Link to={`/projects/${p.id}/timer`} style={{ padding: "8px 10px" }}>
                      作業する
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <CreateProjectModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={onCreate} />
    
    <section style={{ marginTop: 12 }}>
        <ContributionHeatmap commits={commitsAll} title="All Activity" />
    </section>
    <section>
        <CalendarPage  />
    </section>
    </main>
  );
}