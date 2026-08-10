import { useMemo, useState } from "react";
import type { Commit } from "../logic/types";

type Mode = "last365" | "year";

type Props = {
  commits: Commit[];
  title?: string;
};

// --- 日付ユーティリティ (前述の改善版と同様) ---
function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(ts: number, days: number) {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

function levelFrom(commitsCount: number, minutes: number) {
  if (commitsCount <= 0) return 0;
  const hours = minutes / 60;
  if (hours >= 5) return 4;
  if (hours >= 3) return 3;
  if (hours >= 2) return 2;
  return 1;
}

function levelColor(level: number) {
  switch (level) {
    case 0: return "#ebedf0";
    case 1: return "#9be9a8";
    case 2: return "#40c463";
    case 3: return "#30a14e";
    case 4: return "#216e39";
    default: return "#ebedf0";
  }
}

function formatMinutes(min: number) {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function ContributionHeatmap({ commits, title }: Props) {
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const c of commits) set.add(new Date(c.endedAt).getFullYear());
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [commits]);

  const [mode, setMode] = useState<Mode>("last365");
  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const statsByDay = useMemo(() => {
    const map = new Map<string, { minutes: number; commits: number }>();
    for (const c of commits) {
      const k = dayKey(c.endedAt);
      const prev = map.get(k) ?? { minutes: 0, commits: 0 };
      map.set(k, {
        minutes: prev.minutes + Math.floor(c.durationMs / 60000),
        commits: prev.commits + 1,
      });
    }
    return map;
  }, [commits]);

  const range = useMemo(() => {
    if (mode === "last365") {
      const end = startOfDay(Date.now());
      const start = addDays(end, -364);
      return { start, end, label: "Last 365 days" };
    }
    const start = startOfDay(new Date(year, 0, 1).getTime());
    const end = startOfDay(new Date(year, 11, 31).getTime());
    return { start, end, label: String(year) };
  }, [mode, year]);

  const aligned = useMemo(() => {
    const startD = new Date(range.start);
    const endD = new Date(range.end);
    return {
      start: addDays(range.start, -startD.getDay()),
      end: addDays(range.end, 6 - endD.getDay()),
    };
  }, [range]);

  const columns = useMemo(() => {
    const cells = [];
    let curr = aligned.start;
    while (curr <= aligned.end) {
      const k = dayKey(curr);
      const stat = statsByDay.get(k) ?? { minutes: 0, commits: 0 };
      cells.push({
        ts: curr,
        key: k,
        minutes: stat.minutes,
        level: levelFrom(stat.commits, stat.minutes),
        inRange: curr >= range.start && curr <= range.end,
      });
      curr = addDays(curr, 1);
    }
    const cols = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    return cols;
  }, [aligned, statsByDay, range]);

  // 月ラベルの計算（表示位置のピクセルオフセット付き）
  const monthLabels = useMemo(() => {
    const labels: { colIndex: number; label: string }[] = [];
    let lastMonth = -1;

    columns.forEach((col, idx) => {
      const d = new Date(col[0].ts);
      const month = d.getMonth();
      if (month !== lastMonth) {
        labels.push({
          colIndex: idx,
          label: d.toLocaleString("en-US", { month: "short" }),
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [columns]);

  return (
    <section style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13 }}>
      {title && <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px 0", color: "#1f2328" }}>{title}</h3>}

      {/* Control Header */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={() => { setMode("last365"); setSelectedDate(null); }}
          style={{
            padding: "4px 12px",
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid",
            borderColor: mode === "last365" ? "#0969da" : "#d0d7de",
            background: mode === "last365" ? "#ddf4ff" : "#f6f8fa",
            color: mode === "last365" ? "#0969da" : "#24292f",
            fontWeight: mode === "last365" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          直近1年
        </button>

        {years.map((y) => (
          <button
            key={y}
            onClick={() => { setYear(y); setMode("year"); setSelectedDate(null); }}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid",
              borderColor: mode === "year" && year === y ? "#0969da" : "#d0d7de",
              background: mode === "year" && year === y ? "#ddf4ff" : "#f6f8fa",
              color: mode === "year" && year === y ? "#0969da" : "#24292f",
              fontWeight: mode === "year" && year === y ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {y}
          </button>
        ))}

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#636c76", fontWeight: 500 }}>
          {range.label}
        </div>
      </div>

      {/* Heatmap Area */}
      <div style={{ border: "1px solid #d0d7de", borderRadius: 6, padding: 16, background: "#fff" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "inline-block", minWidth: "100%" }}>
            
            {/* 月ラベル (絶対配置で位置ずれを防止) */}
            <div style={{ position: "relative", height: 18, marginLeft: 28, marginBottom: 4 }}>
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: m.colIndex * 16, // 12px(セル幅) + 4px(gap) = 16px
                    fontSize: 10,
                    color: "#636c76",
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {/* 曜日ラベル (月・水・金のみ表示) */}
              <div style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gap: 4, fontSize: 9, color: "#636c76", paddingRight: 4, textAlign: "right", userSelect: "none" }}>
                <span></span>
                <span>Mon</span>
                <span></span>
                <span>Wed</span>
                <span></span>
                <span>Fri</span>
                <span></span>
              </div>

              {/* グリッドセル */}
              <div style={{ display: "flex", gap: 4 }}>
                {columns.map((col, colIdx) => (
                  <div key={colIdx} style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gap: 4 }}>
                    {col.map((c) => {
                      const isSelected = selectedDate === c.key;
                      return (
                        <div
                          key={c.key}
                          title={`${c.key} / ${formatMinutes(c.minutes)}`}
                          onClick={() => setSelectedDate(c.key)}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            backgroundColor: c.inRange ? levelColor(c.level) : "#ffffff",
                            outline: isSelected ? "2px solid #0969da" : "1px solid rgba(27,31,36,0.06)",
                            outlineOffset: isSelected ? -1 : 0,
                            opacity: c.inRange ? 1 : 0.2,
                            cursor: "pointer",
                            transition: "transform 0.1s ease",
                            zIndex: isSelected ? 2 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* 凡例 (Legend) */}
        <div style={{ marginTop: 12, display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end", fontSize: 11, color: "#636c76" }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((lv) => (
            <span
              key={lv}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: levelColor(lv),
                outline: "1px solid rgba(27,31,36,0.06)",
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDate && (() => {
        const filtered = commits.filter((c) => dayKey(c.endedAt) === selectedDate);
        return (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #d0d7de", borderRadius: 6, background: "#f6f8fa" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#1f2328" }}>
              {selectedDate} の詳細 ({filtered.length} 件)
            </div>
            {filtered.length === 0 ? (
              <div style={{ color: "#636c76", fontSize: 12 }}>記録はありません</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filtered.map((c) => (
                  <div key={c.id} style={{ padding: "6px 8px", background: "#fff", borderRadius: 4, border: "1px solid #e1e4e8" }}>
                    <div style={{ fontWeight: 500, fontSize: 12, color: "#0969da" }}>
                      {new Date(c.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span style={{ color: "#57606a", fontWeight: 400, marginLeft: 8 }}>
                        ({Math.floor(c.durationMs / 60000)}分)
                      </span>
                    </div>
                    {c.note && <div style={{ fontSize: 12, color: "#24292f", marginTop: 2 }}>{c.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}