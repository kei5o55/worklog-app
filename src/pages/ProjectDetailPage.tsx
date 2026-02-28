import { Link, useParams } from "react-router-dom";

export default function ProjectDetailPage() {
    const { projectId } = useParams();

    // 仮データ（あとでDB/ローカルに差し替え）
    const commits = [
        { id: "c1", duration: "00:25:10", at: "2026-03-01 13:00", note: "ラフ→線画少し" },
        { id: "c2", duration: "01:02:03", at: "2026-03-02 20:10", note: "顔の調整 / 目" },
    ];

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0 }}>Project {projectId}</h1>
            <div style={{ marginLeft: "auto" }}>
            <Link to={`/projects/${projectId}/timer`}>作業する</Link>
            </div>
        </div>

        {/* 上：サマリー（仮） */}
        <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div>コミット回数：{commits.length}</div>
            <div>累計時間：（後で計算）</div>
        </section>

        {/* 中：履歴 */}
        <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 16 }}>履歴</h2>
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
            {commits.map((c) => (
                <li key={c.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ fontVariantNumeric: "tabular-nums" }}>{c.duration}</strong>
                    <span style={{ fontSize: 12, color: "#666" }}>{c.at}</span>
                </div>
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{c.note}</p>
                </li>
            ))}
            </ul>
        </section>

        {/* 下：ギャラリー（仮） */}
        <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 16 }}>Gallery（仮）</h2>
            <div
            style={{
                border: "1px dashed #bbb",
                borderRadius: 12,
                padding: 16,
                color: "#777",
            }}
            >
            画像がまだありません（ここに進捗画像が並びます）
            </div>
        </section>
        </main>
    );
}