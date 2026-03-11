// src/pages/CalendarPage.tsx
import { useMemo, useState } from "react";
import ScheduleCalendar from "../components/ScheduleCalendar";
import CalendarDayDetail from "../components/CalendarDayDetail";
import {
    addCalendarMemo,
    loadCalendarMemos,
    loadCommits,
    loadProjects,
    deleteCalendarMemo,
} from "../logic/storage";
import type { CalendarCell,Project } from "../logic/types";

type CalendarPageProps = {
  projectsFromParent?: Project[]; 
};

export default function CalendarPage({ projectsFromParent }: CalendarPageProps) {
    const [current, setCurrent] = useState(() => new Date());
    const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    

    const year = current.getFullYear();
    const month = current.getMonth();

    // 親から projects が届いている場合はそれを使い、なければ自分でロードする
    const projects = useMemo(() => {
        return projectsFromParent ?? loadProjects();
    }, [projectsFromParent, refreshKey]); // projectsFromParent が変われば自動で再計算される
    const memos = useMemo(() => loadCalendarMemos(), [refreshKey]);
    const commits = useMemo(() => loadCommits(), [refreshKey]);

    const handleAddMemo = (date: string) => {
        const text = window.prompt(`${date} のメモを入力してください`);
        if (!text || !text.trim()) return;

        const newMemo = {
            id: crypto.randomUUID(),
            date,
            text: text.trim(),
            createdAt: Date.now(),
        };

        // 1. ストレージに保存
        addCalendarMemo(newMemo);

        // 2. カレンダー全体のデータをリロード（これだけだと selectedCell は古いまま）
        setRefreshKey((prev) => prev + 1);

        // 3. ★重要：現在表示中の詳細（selectedCell）にも新しいメモをねじ込む
        if (selectedCell && selectedCell.date === date) {
            setSelectedCell({
                ...selectedCell,
                memos: [...selectedCell.memos, newMemo] // 既存のメモに新しいのを追加
            });
        }
    };

    const handleDeleteMemo = (memoId: string) => {
        // 1. ストレージから削除
        deleteCalendarMemo(memoId);

        // 2. カレンダー全体のデータをリロード（念のため）
        setRefreshKey((prev) => prev + 1);

        // 3. 【追加】現在表示中の詳細（selectedCell）からも、削除したメモを「除外」する
        if (selectedCell) {
            setSelectedCell({
                ...selectedCell,
                memos: selectedCell.memos.filter((m) => m.id !== memoId) // 指定したID以外を残す
            });
        }
    };
        

    const moveMonth = (diff: number) => {
        setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
    };

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