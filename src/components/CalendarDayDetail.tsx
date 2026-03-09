// src/components/CalendarDayDetail.tsx
import type { CalendarCell } from "../logic/types";

type Props = {
    cell: CalendarCell | null;
    onAddMemo?: (date: string) => void;
};

export default function CalendarDayDetail({ cell, onAddMemo }: Props) {
    if (!cell) {
        return (
        <section style={styles.wrapper}>
            <h3 style={styles.title}>日付詳細</h3>
            <p style={styles.empty}>カレンダーの日付をクリックしてください。</p>
        </section>
        );
    }

    const hasAnyInfo =
        cell.dueProjects.length > 0 ||
        cell.projects.length > 0 ||
        cell.memos.length > 0 ||
        cell.commits.length > 0;

    return (
        <section style={styles.wrapper}>
        <div style={styles.header}>
            <h3 style={styles.title}>{cell.date} の予定</h3>
            <button type="button" onClick={() => onAddMemo?.(cell.date)}>
                メモ追加
            </button>
        </div>

        {!hasAnyInfo ? (
            <p style={styles.empty}>予定はありません</p>
        ) : (
            <>
            <div style={styles.section}>
                <h4 style={styles.sectionTitle}>納期</h4>
                {cell.dueProjects.length === 0 ? (
                <p style={styles.empty}>なし</p>
                ) : (
                <ul>
                    {cell.dueProjects.map((project) => (
                    <li key={project.id}>{project.name}</li>
                    ))}
                </ul>
                )}
            </div>

            <div style={styles.section}>
                <h4 style={styles.sectionTitle}>進行中プロジェクト</h4>
                {cell.projects.length === 0 ? (
                <p style={styles.empty}>なし</p>
                ) : (
                <ul>
                    {cell.projects.map((project) => (
                    <li key={project.id}>{project.name}</li>
                    ))}
                </ul>
                )}
            </div>

            <div style={styles.section}>
                <h4 style={styles.sectionTitle}>メモ</h4>
                {cell.memos.length === 0 ? (
                <p style={styles.empty}>なし</p>
                ) : (
                <ul>
                    {cell.memos.map((memo) => (
                    <li key={memo.id}>{memo.text}</li>
                    ))}
                </ul>
                )}
            </div>

            <div style={styles.section}>
                <h4 style={styles.sectionTitle}>作業ログ</h4>
                {cell.commits.length === 0 ? (
                <p style={styles.empty}>なし</p>
                ) : (
                <ul>
                    {cell.commits.map((commit) => (
                    <li key={commit.id}>{commit.note || "作業ログ"}</li>
                    ))}
                </ul>
                )}
            </div>
            </>
        )}
        </section>
    );
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        marginTop: 20,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fafafa",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    title: {
        margin: 0,
    },
    section: {
        marginTop: 16,
    },
    sectionTitle: {
        margin: "0 0 8px 0",
    },
    empty: {
        color: "#666",
        margin: 0,
    },
};