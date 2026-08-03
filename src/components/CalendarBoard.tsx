// src/pages/CalendarPage.tsx
import { useEffect, useState } from "react";
import ScheduleCalendar from "../components/ScheduleCalendar";
import CalendarDayDetail from "../components/CalendarDayDetail";
import {
  addCalendarMemoIdb,
  loadCalendarMemosIdb,
  loadCommitsIdb,
  loadProjectsIdb,
  deleteCalendarMemoIdb,
} from "../logic/storage-idb";
import type {
  CalendarCell,
  Project,
  CalendarMemo,
  Commit,
} from "../logic/types";

type CalendarPageProps = {
  projectsFromParent?: Project[];
};

export default function CalendarPage({
  projectsFromParent,
}: CalendarPageProps) {
  const [current, setCurrent] = useState(() => new Date());
  const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);

  const [projects, setProjects] = useState<Project[]>(projectsFromParent ?? []);
  const [memos, setMemos] = useState<CalendarMemo[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);

  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [loadedProjects, loadedMemos, loadedCommits] = await Promise.all([
          projectsFromParent
            ? Promise.resolve(projectsFromParent)
            : loadProjectsIdb(),
          loadCalendarMemosIdb(),
          loadCommitsIdb(),
        ]);

        if (cancelled) return;

        setProjects(loadedProjects);
        setMemos(loadedMemos);
        setCommits(loadedCommits);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [projectsFromParent]);

  const handleAddMemo = async (date: string) => {
    const text = window.prompt(`${date} のメモを入力してください`);
    if (!text || !text.trim()) return;

    const newMemo = {
      id: crypto.randomUUID(),
      date,
      text: text.trim(),
      createdAt: Date.now(),
    };

    await addCalendarMemoIdb(newMemo);

    setMemos((prev) => [...prev, newMemo]);

    if (selectedCell && selectedCell.date === date) {
      setSelectedCell({
        ...selectedCell,
        memos: [...selectedCell.memos, newMemo],
      });
    }
  };

  const handleDeleteMemo = async (memoId: string) => {
    await deleteCalendarMemoIdb(memoId);

    setMemos((prev) => prev.filter((m) => m.id !== memoId));

    if (selectedCell) {
      setSelectedCell({
        ...selectedCell,
        memos: selectedCell.memos.filter((m) => m.id !== memoId),
      });
    }
  };

  const moveMonth = (diff: number) => {
    setCurrent(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1),
    );
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <ScheduleCalendar
        year={year}
        month={month}
        projects={projects}
        memos={memos}
        commits={commits}
        onSelectDate={setSelectedCell}
        moveMonth={moveMonth}
      />

      <CalendarDayDetail
        cell={selectedCell}
        projects={projects}
        onAddMemo={handleAddMemo}
        onDeleteMemo={handleDeleteMemo}
      />
    </div>
  );
}
