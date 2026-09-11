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
import { loadProjects,loadCalendarMemos,loadCommits,createCalendarMemo,deleteCalendarMemo } from "../logic/api-request";

const isApiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

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
        // APIモードとローカルモードで取得処理を分岐
        const projectsPromise = projectsFromParent
          ? Promise.resolve(projectsFromParent)
          : isApiMode
          ? loadProjects() // Rails バックエンドから取得
          : loadProjectsIdb(); // IndexedDB から取得

        const memosPromise = isApiMode
          ? loadCalendarMemos() // Rails API (必要に応じて関数名は合わせてください)
          : loadCalendarMemosIdb();

        const commitsPromise = isApiMode
          ? loadCommits() // Rails API (必要に応じて関数名は合わせてください)
          : loadCommitsIdb();

        const [loadedProjects, loadedMemos, loadedCommits] = await Promise.all([
          projectsPromise,
          memosPromise,
          commitsPromise,
        ]);

        if (cancelled) return;

        setProjects(loadedProjects);
        setMemos(loadedMemos);
        setCommits(loadedCommits);
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [projectsFromParent, isApiMode]);

  const handleAddMemo = async (date: string) => {
    const text = window.prompt(`${date} のメモを入力してください`);
    if (!text || !text.trim()) return;

    const trimmedText = text.trim();

    if (isApiMode) {
      // 🌐 API モード: Rails バックエンドへ POST リクエスト送信
      try {
        // Rails側で作成されたレコード（IDや作成日時が含まれる）を受け取る
        const createdMemo = await createCalendarMemo({
          date,
          text: trimmedText,
        });

        if (!createdMemo) throw new Error("Failed to create memo");

        setMemos((prev) => [...prev, createdMemo]);

        if (selectedCell && selectedCell.date === date) {
          setSelectedCell((prev) =>
            prev
              ? {
                  ...prev,
                  memos: [...prev.memos, createdMemo],
                }
              : null
          );
        }
      } catch (error) {
        console.error("Failed to add memo:", error);
        alert("メモの追加に失敗しました");
      }
    } else {
      // 💾 ローカルモード: IndexedDB に保存
      const newMemo = {
        id: crypto.randomUUID(),
        date,
        text: trimmedText,
        createdAt: Date.now(),
      };

      await addCalendarMemoIdb(newMemo);

      setMemos((prev) => [...prev, newMemo]);

      if (selectedCell && selectedCell.date === date) {
        setSelectedCell((prev) =>
          prev
            ? {
                ...prev,
                memos: [...prev.memos, newMemo],
              }
            : null
        );
      }
    }
  };

  const handleDeleteMemo = async (memoId: string) => {
    // 元のステートを保持（ロールバック用）
    const previousMemos = [...memos];
    const previousSelectedCell = selectedCell ? { ...selectedCell } : null;

    // 先にUI側のステートを更新（楽観的更新）
    setMemos((prev) => prev.filter((m) => m.id !== memoId));
    if (selectedCell) {
      setSelectedCell((prev) =>
        prev
          ? {
              ...prev,
              memos: prev.memos.filter((m) => m.id !== memoId),
            }
          : null
      );
    }

    try {
      if (isApiMode) {
        // 🌐 API モード: Rails バックエンドへ DELETE リクエスト送信
        const success = await deleteCalendarMemo(memoId);
        if (!success) {
          throw new Error("Failed to delete memo on server");
        }
      } else {
        // 💾 ローカルモード: IndexedDB から削除
        await deleteCalendarMemoIdb(memoId);
      }
    } catch (error) {
      console.error("Failed to delete memo:", error);
      alert("メモの削除に失敗しました");

      // 失敗した場合は元の状態にロールバック
      setMemos(previousMemos);
      setSelectedCell(previousSelectedCell);
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
