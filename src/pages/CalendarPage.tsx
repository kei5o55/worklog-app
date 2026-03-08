import { useMemo, useState } from "react";
import ScheduleCalendar from "../components/ScheduleCalendar";
import {
  addCalendarMemo,
  loadCalendarMemos,
  loadCommits,
  loadProjects,
} from "../logic/storage";
import type { CalendarCell } from "../logic/types";

function toYearMonth(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  };
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(() => new Date());
  const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { year, month } = toYearMonth(current);

  const projects = useMemo(() => loadProjects(), [refreshKey]);
  const memos = useMemo(() => loadCalendarMemos(), [refreshKey]);
  const commits = useMemo(() => loadCommits(), [refreshKey]);

  const moveMonth = (diff: number) => {
    setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
  };

  const handleAddMemo = () => {
    if (!selectedCell) return;

    const text = window.prompt("メモを入力してください");
    if (!text || !text.trim()) return;

    addCalendarMemo({
      id: crypto.randomUUID(),
      date: selectedCell.date,
      text: text.trim(),
      createdAt: Date.now(),
    });

    setRefreshKey((k) => k + 1);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => moveMonth(-1)}>← 前月</button>
        <button onClick={() => moveMonth(1)}>次月 →</button>
      </div>

      <ScheduleCalendar
        year={year}
        month={month}
        projects={projects}
        memos={memos}
        commits={commits}
        onSelectDate={setSelectedCell}
      />

      {selectedCell && (
        <div
          style={{
            marginTop: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h3>{selectedCell.date}</h3>

          <div style={{ marginTop: 12 }}>
            <strong>プロジェクト</strong>
            {selectedCell.projects.length === 0 ? (
              <p>なし</p>
            ) : (
              <ul>
                {selectedCell.projects.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <strong>メモ</strong>
            {selectedCell.memos.length === 0 ? (
              <p>なし</p>
            ) : (
              <ul>
                {selectedCell.memos.map((m) => (
                  <li key={m.id}>{m.text}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <strong>作業ログ</strong>
            {selectedCell.commits.length === 0 ? (
              <p>なし</p>
            ) : (
              <ul>
                {selectedCell.commits.map((c) => (
                  <li key={c.id}>{c.note || "作業ログ"}</li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={handleAddMemo} style={{ marginTop: 12 }}>
            メモを追加
          </button>
        </div>
      )}
    </div>
  );
}