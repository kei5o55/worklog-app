import { useMemo, useState } from "react";
import { buildCalendarCells } from "../logic/calendar";
import type { CalendarCell, CalendarMemo, Commit, Project } from "../logic/types";

type Props = {
  year: number;
  month: number; // 0-based
  projects: Project[];
  memos: CalendarMemo[];
  commits: Commit[];
  onSelectDate?: (cell: CalendarCell) => void;
};

const WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function ScheduleCalendar({
  year,
  month,
  projects,
  memos,
  commits,
  onSelectDate,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const cells = useMemo(() => {
    return buildCalendarCells(year, month, projects, memos, commits);
  }, [year, month, projects, memos, commits]);

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>
        {year}年 {month + 1}月
      </h2>

      <div style={styles.weekHeader}>
        {WEEK_LABELS.map((label) => (
          <div key={label} style={styles.weekCell}>
            {label}
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        {cells.map((cell) => {
          const day = Number(cell.date.slice(-2));
          const isSelected = selectedDate === cell.date;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => {
                setSelectedDate(cell.date);
                onSelectDate?.(cell);
              }}
              style={{
                ...styles.cell,
                opacity: cell.isCurrentMonth ? 1 : 0.45,
                border: isSelected ? "2px solid #222" : "1px solid #ddd",
              }}
            >
              <div style={styles.dayNumber}>{day}</div>

              <div style={styles.items}>
                {cell.projects.slice(0, 2).map((project) => (
                  <div
                    key={project.id}
                    style={{
                      ...styles.projectBadge,
                      backgroundColor: project.color ?? "#4f8cff",
                    }}
                    title={project.name}
                  >
                    {project.name}
                  </div>
                ))}

                {cell.memos.slice(0, 2).map((memo) => (
                  <div key={memo.id} style={styles.memoText} title={memo.text}>
                    • {memo.text}
                  </div>
                ))}

                {cell.commits.length > 0 && (
                  <div style={styles.commitInfo}>
                    作業 {cell.commits.length}件
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: "100%",
  },
  title: {
    marginBottom: 16,
  },
  weekHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: 8,
  },
  weekCell: {
    textAlign: "center",
    fontWeight: 700,
    padding: "8px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 8,
  },
  cell: {
    minHeight: 120,
    background: "#fff",
    borderRadius: 8,
    padding: 8,
    textAlign: "left",
    cursor: "pointer",
  },
  dayNumber: {
    fontWeight: 700,
    marginBottom: 8,
  },
  items: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  projectBadge: {
    color: "#fff",
    borderRadius: 6,
    padding: "2px 6px",
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  memoText: {
    fontSize: 12,
    color: "#333",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  commitInfo: {
    fontSize: 12,
    color: "#666",
  },
};