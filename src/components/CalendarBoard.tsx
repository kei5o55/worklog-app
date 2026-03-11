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
import type { CalendarCell } from "../logic/types";

export default function CalendarPage() {
    const [current, setCurrent] = useState(() => new Date());
    const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    

    const year = current.getFullYear();
    const month = current.getMonth();

    const projects = useMemo(() => loadProjects(), [refreshKey]);
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
        window.alert(`メモ ${memoId} を削除します（実装はまだ）`);
        deleteCalendarMemo(memoId);
    }
        

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