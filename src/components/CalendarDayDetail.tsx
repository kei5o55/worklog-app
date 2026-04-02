import type { CalendarCell, Project } from "../logic/types";

type Props = {
    cell: CalendarCell | null;
    projects: Project[];
    onAddMemo?: (date: string) => void;
    onDeleteMemo?: (memoId: string) => void;
};

function groupCommitsByProject(cell: CalendarCell, projects: Project[]) {
    const grouped = new Map<
        string,
        {
            projectName: string;
            commits: typeof cell.commits;
        }
    >();

    for (const commit of cell.commits) {
        const project = projects.find((p) => p.id === commit.projectId);
        const projectName = project?.name ?? "不明なプロジェクト";

        const existing = grouped.get(commit.projectId);
        if (existing) {
            existing.commits.push(commit);
        } else {
            grouped.set(commit.projectId, {
                projectName,
                commits: [commit],
            });
        }
    }

    return Array.from(grouped.entries()).map(([projectId, value]) => ({
        projectId,
        projectName: value.projectName,
        commits: value.commits,
    }));
}

export default function CalendarDayDetail({ cell, projects, onAddMemo, onDeleteMemo }: Props) {
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

    const groupedCommits = groupCommitsByProject(cell, projects);

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
                            <ul style={styles.list}>
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
                            <ul style={styles.list}>
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
                            <ul style={styles.list}>
                                {cell.memos.map((memo) => (
                                    <li key={memo.id}>
                                        {memo.text}
                                        <button type="button" onClick={() => onDeleteMemo?.(memo.id)}>
                                            削除
                                        </button>
                                    </li>
                                    
                                ))}
                            </ul>
                        )}
                    </div>

                    <div style={styles.section}>
                        <h4 style={styles.sectionTitle}>作業ログ</h4>
                        {cell.commits.length === 0 ? (
                            <p style={styles.empty}>なし</p>
                        ) : (
                            <div style={styles.groupList}>
                                {groupedCommits.map((group) => (
                                    <div key={group.projectId} style={styles.groupBlock}>
                                        <div style={styles.groupTitle}>{group.projectName}</div>
                                        <ul style={styles.list}>
                                            {group.commits.map((commit) => (
                                                <li key={commit.id}>
                                                    {commit.note?.trim() ? commit.note : "メモ無し"}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
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
    list: {
        margin: 0,
        paddingLeft: 20,
    },
    groupList: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    groupBlock: {
        padding: 10,
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        background: "#fff",
    },
    groupTitle: {
        fontWeight: 700,
        marginBottom: 6,
    },
};