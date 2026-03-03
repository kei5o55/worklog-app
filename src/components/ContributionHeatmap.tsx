import React, { useMemo, useState } from "react";
import type { Commit } from "../logic/types";

type Mode = "last365" | "year";

type Props = {
  commits: Commit[];
  title?: string;
};

function dayKey(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(ts: number, days: number) {
  return ts + days * 24 * 60 * 60 * 1000;
}

function alignToSunday(ts: number) {
  const d = new Date(ts);
  const dow = d.getDay(); // 0=Sun
  return addDays(ts, -dow);
}

function alignToSaturday(ts: number) {
  const d = new Date(ts);
  const dow = d.getDay(); // 6=Sat
  return addDays(ts, 6 - dow);
}

function levelFrom(commitsCount: number, minutes: number) {
  if (commitsCount <= 0) return 0; // 1コミットで点灯したいのでここが重要

  const hours = minutes / 60;
  if (hours >= 5) return 4;
  if (hours >= 3) return 3;
  if (hours >= 2) return 2;
  return 1;
}

function levelColor(level: number) {
  // とりあえずGitHubっぽい
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

function getYearsFromCommits(commits: Commit[]) {
  const years = new Set<number>();
  for (const c of commits) years.add(new Date(c.endedAt).getFullYear());
  const nowY = new Date().getFullYear();
  years.add(nowY); // 今年は常に見えるように
  return Array.from(years).sort((a, b) => b - a);
}

export default function ContributionHeatmap({ commits, title }: Props) {
  const years = useMemo(() => getYearsFromCommits(commits), [commits]);

  const [mode, setMode] = useState<Mode>("last365");
  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);


    // 日別の合計時間とコミット数
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

    // 指定年（1/1〜12/31）を表示
    const start = startOfDay(new Date(year, 0, 1).getTime());
    const end = startOfDay(new Date(year, 11, 31).getTime());
    return { start, end, label: String(year) };
  }, [mode, year]);

  // GitHub風の長方形にするため、表示範囲を週境界に揃える
  const aligned = useMemo(() => {
    const start = alignToSunday(range.start);
    const end = alignToSaturday(range.end);
    return { start, end };
  }, [range.start, range.end]);

  // セル（7日×週数）
    const columns = useMemo(() => {
        const cells: { ts: number; key: string; minutes: number; level: number; inRange: boolean }[] = [];

        for (let ts = aligned.start; ts <= aligned.end; ts = addDays(ts, 1)) {
            const k = dayKey(ts);
            const stat = statsByDay.get(k) ?? { minutes: 0, commits: 0 };
            const minutes = stat.minutes;
            const commitsCount = stat.commits;
            const level = levelFrom(commitsCount, minutes);
            const inRange = ts >= range.start && ts <= range.end;
            cells.push({ ts, key: k, minutes, level, inRange });
        }

        // 7日ずつ区切って列にする（縦7）
        const cols: typeof cells[] = [];
            for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
            return cols;
    }, [aligned.start, aligned.end, statsByDay, range.start, range.end]);

    const monthLabels = useMemo(() => {
        return columns.map((col) => {
            const first = col[0]; // その週の最初の日（日曜）
            const d = new Date(first.ts);
            return {
            month: d.getMonth(),
            label: d.toLocaleString("default", { month: "short" }), // Jan, Feb...
            };
        });
    }, [columns]);

  return (
    <section>
      {title ? <h3 style={{ fontSize: 14, margin: "8px 0" }}>{title}</h3> : null}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <button
          onClick={() => setMode("last365")}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #ddd",
            background: mode === "last365" ? "#f3f4f6" : "white",
            cursor: "pointer",
          }}
        >
          直近1年
        </button>

        {years.map((y) => (
          <button
            key={y}
            onClick={() => {
              setYear(y);
              setMode("year");
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: mode === "year" && year === y ? "#f3f4f6" : "white",
              cursor: "pointer",
            }}
          >
            {y}
          </button>
        ))}

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>{range.label}</div>
      </div>
      {/* Month labels */}
        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {monthLabels.map((m, i) => {
                const prev = monthLabels[i - 1];
                const show = i === 0 || prev.month !== m.month;

                return (
                <div key={i} style={{ width: 12, fontSize: 10, color: "#666" }}>
                    {show ? m.label : ""}
                </div>
                );
            })}
        </div>

      {/* Grid */}
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
          {columns.map((col, i) => (
            <div key={i} style={{ display: "grid", gap: 4 }}>
              {col.map((c) => (
                <div
                  key={c.key + String(c.ts)}
                  title={`${c.key} / ${formatMinutes(c.minutes)}`}
                  onClick={() => setSelectedDate(c.key)}
                  style={{
                    cursor: "pointer",
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: c.inRange ? levelColor(c.level) : "#ffffff",
                    outline: "1px solid rgba(0,0,0,0.06)",
                    opacity: c.inRange ? 1 : 0.25,
                    
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {selectedDate && (() => {
        const filtered = commits.filter((c) => dayKey(c.endedAt) === selectedDate);
        return (
            <div style={{ marginTop: 12 }}>
            <h4>{selectedDate} のコミット</h4>
            {filtered.length === 0 ? (
                <div style={{ color: "#999", fontSize: 14 }}>コミットはありません</div>
            ) : (
                filtered.map((c) => (
                <div key={c.id} style={{ padding: 6, borderBottom: "1px solid #eee" }}>
                    {new Date(c.endedAt).toLocaleTimeString()} / {Math.floor(c.durationMs / 60000)}min
                    <div style={{ fontSize: 12, color: "#666" }}>{c.note}</div>
                </div>
                ))
            )}
            </div>
        );
        })()}

      {/* Legend */}
      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#666" }}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((lv) => (
          <span
            key={lv}
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 3,
              background: levelColor(lv),
              outline: "1px solid rgba(0,0,0,0.06)",
            }}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}