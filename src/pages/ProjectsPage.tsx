import { Link } from "react-router-dom";

export default function ProjectsPage() {
  // まずは仮で1つ
  const p = { id: "p1", title: "NARAKU" };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Projects</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 18 }}>{p.title}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <Link to={`/projects/${p.id}`}>詳細</Link>
          <Link to={`/projects/${p.id}/timer`}>作業する</Link>
        </div>
      </div>
    </main>
  );
}