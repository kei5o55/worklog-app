import { useEffect, useMemo, useRef, useState } from "react";

import type { DraftCommit } from "../components/CommitModal";

import CommitModal from "../components/CommitModal";

import { useNavigate, useParams } from "react-router-dom";



type WorkSession = {
    id: string;
    projectId: string;
    startedAt: number;
    endedAt?: number;
    note: string;

    // 追加：一時停止対応
    status: "running" | "paused";
    pausedAt?: number;
};



function pad2(n: number) {
    return String(n).padStart(2, "0");
}



function formatMs(ms: number) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}



function uid() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}



const STORAGE_KEY = "worklog:sessions:v1";



function loadSessions(): WorkSession[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as WorkSession[];
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
}



function saveSessions(sessions: WorkSession[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}



const COMMITS_KEY = "worklog:commits:v1";



type Commit = {
    id: string;
    projectId: string;
    startedAt: number;
    endedAt: number;
    durationMs: number;
    note: string;
};



const loadCommits = (): Commit[] => {
    try {
        const raw = localStorage.getItem(COMMITS_KEY);
        return raw ? (JSON.parse(raw) as Commit[]) : [];
    } catch {
        return [];
    }
};



const saveCommits = (commits: Commit[]) => {
    localStorage.setItem(COMMITS_KEY, JSON.stringify(commits));
};



const addCommit = (commit: Commit) => {
    const prev = loadCommits();
    saveCommits([commit, ...prev]);
};



export default function TimerPage() {
    const [sessions, setSessions] = useState<WorkSession[]>(() => loadSessions());

    // いまは仮。将来は projectId からプロジェクト名を引く
    const [selectedProject] = useState({ id: "p1", name: "NARAKU" });

    const [draftCommit, setDraftCommit] = useState<DraftCommit | null>(null);
    const [isCommitOpen, setIsCommitOpen] = useState(false);

    const navigate = useNavigate();
    const { projectId } = useParams();

    // 表示用の現在時刻（runningのときだけ更新）
    const [now, setNow] = useState<number>(() => Date.now());

    // 未終了セッション（1つだけ運用想定）
    const activeSession = useMemo(
        () => sessions.find((s) => s.endedAt == null) ?? null,
        [sessions]
    );

    const running = useMemo(
        () => sessions.find((s) => s.endedAt == null && s.status === "running") ?? null,
        [sessions]
    );

    const paused = useMemo(
        () => sessions.find((s) => s.endedAt == null && s.status === "paused") ?? null,
        [sessions]
    );

    const [note, setNote] = useState<string>(activeSession?.note ?? "");

    // activeSessionが切り替わったらメモ欄を同期
    useEffect(() => {
        setNote(activeSession?.note ?? "");
    }, [activeSession?.id]);

    // sessionsが変わったら永続化
    useEffect(() => {
        saveSessions(sessions);
    }, [sessions]);

    // runningのときだけ時刻更新（表示更新）
    useEffect(() => {
        if (!running) return;
        const id = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(id);
    }, [running]);

    // 経過時間（pausedならpausedAtで止める）
    const currentElapsedMs = useMemo(() => {
        const s = activeSession;
        if (!s) return 0;

        if (s.status === "paused") {
            const end = s.pausedAt ?? now;
            return end - s.startedAt;
        }
        // running
        return now - s.startedAt;
    }, [activeSession, now]);

    // --- 一時停止/再開 ---
    const pause = () => {
        if (!running) return;
        const pausedAt = Date.now();
        setSessions((prev) =>
            prev.map((s) => (s.id === running.id ? { ...s, status: "paused", pausedAt } : s))
        );
    };

    const resume = () => {
        if (!paused) return;

        const pausedAt = paused.pausedAt ?? Date.now();
        const pausedElapsed = pausedAt - paused.startedAt;
        const nowTs = Date.now();

        // startedAt を "now - すでに経過した分" にずらすことで、
        // 再開後も elapsed が連続する
        setSessions((prev) =>
            prev.map((s) =>
                s.id === paused.id
                    ? {
                          ...s,
                          status: "running",
                          startedAt: nowTs - pausedElapsed,
                          pausedAt: undefined,
                      }
                    : s
            )
        );
    };

    // --- Start / Stop ---
    const startWithProject = (pid: string) => {
        if (activeSession) return; // 未終了があるなら開始しない（1本運用）
        const s: WorkSession = {
            id: uid(),
            projectId: pid,
            startedAt: Date.now(),
            note: "",
            status: "running",
        };
        setSessions((prev) => [s, ...prev]);
    };

    const start = () => startWithProject(selectedProject.id);

    const stop = () => {
        if (!activeSession) return;

        const endedAt = Date.now();
        const effectiveEnd =
            activeSession.status === "paused"
                ? activeSession.pausedAt ?? endedAt
                : endedAt;

        const draft: DraftCommit = {
            projectId: selectedProject.id,
            projectName: selectedProject.name,
            startedAt: activeSession.startedAt,
            endedAt: effectiveEnd,
            note: activeSession.note ?? "",
            commitNumber: 1, // TODO: project単位で数える
            todayTotalMs: effectiveEnd - activeSession.startedAt,
            projectTotalMs: effectiveEnd - activeSession.startedAt,
            recentNotes: [],
        };

        setDraftCommit(draft);
        setIsCommitOpen(true);
    };

    const updateActiveNote = (value: string) => {
        setNote(value);
        if (!activeSession) return;
        setSessions((prev) =>
            prev.map((s) => (s.id === activeSession.id ? { ...s, note: value } : s))
        );
    };

    const clearAll = () => {
        if (!confirm("全部消す？（戻せない）")) return;
        setSessions([]);
    };

    // --- 画面離脱 / タブ非表示で自動Pause ---
    const runningRef = useRef<WorkSession | null>(null);
    useEffect(() => {
        runningRef.current = running;
    }, [running]);

    const pauseById = (sessionId: string) => {
        const pausedAt = Date.now();
        setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, status: "paused", pausedAt } : s))
        );
    };

    // アンマウント時（=画面離脱）に自動pause
    useEffect(() => {
        return () => {
            const r = runningRef.current;
            if (!r) return;
            pauseById(r.id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // タブ非表示になったら自動pause（スマホのバックグラウンド対策）
    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState !== "visible") {
                const r = runningRef.current;
                if (!r) return;
                pauseById(r.id);
            }
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- 保存（コミット確定） ---
    const finalizeAndClose = () => {
        // モーダル閉じるだけ（キャンセル）
        setIsCommitOpen(false);
        setDraftCommit(null);
    };

    const finalizeStopSession = () => {
        // activeSession を endedAt で確定させる（sessions履歴として残す）
        if (!activeSession || !draftCommit) return;

        setSessions((prev) =>
            prev.map((s) =>
                s.id === activeSession.id
                    ? { ...s, endedAt: draftCommit.endedAt, status: "paused", pausedAt: undefined }
                    : s
            )
        );
    };

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
            <h1 style={{ fontSize: 22, marginBottom: 12 }}>Worklog Timer</h1>

            <section
                style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                }}
            >
                <div style={{ fontSize: 48, fontVariantNumeric: "tabular-nums", marginBottom: 8 }}>
                    {formatMs(currentElapsedMs)}
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <button
                        onClick={start}
                        disabled={!!activeSession}
                        style={{ padding: "10px 14px", borderRadius: 10 }}
                    >
                        Start
                    </button>

                    <button
                        onClick={pause}
                        disabled={!running}
                        style={{ padding: "10px 14px", borderRadius: 10 }}
                    >
                        Pause
                    </button>

                    <button
                        onClick={resume}
                        disabled={!paused}
                        style={{ padding: "10px 14px", borderRadius: 10 }}
                    >
                        Resume
                    </button>

                    <button
                        onClick={stop}
                        disabled={!activeSession}
                        style={{ padding: "10px 14px", borderRadius: 10 }}
                    >
                        Stop
                    </button>

                    <button
                        onClick={clearAll}
                        style={{ marginLeft: "auto", padding: "10px 14px", borderRadius: 10 }}
                    >
                        Clear
                    </button>
                </div>

                <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
                    メモ（稼働中/一時停止中のセッションに保存）
                </label>
                <textarea
                    value={note}
                    onChange={(e) => updateActiveNote(e.target.value)}
                    placeholder={activeSession ? "今やってる作業を書いておく" : "Startしたら入力できる"}
                    disabled={!activeSession}
                    rows={3}
                    style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />

                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                    {activeSession ? (
                        <>
                            Started: {new Date(activeSession.startedAt).toLocaleString()} /{" "}
                            {activeSession.status === "running" ? "RUNNING" : "PAUSED"}
                        </>
                    ) : (
                        "Not running"
                    )}
                </div>
            </section>

            {/* Sessions一覧（未終了も含む。今は確認用） */}
            <section>
                <h2 style={{ fontSize: 16, marginBottom: 8 }}>Sessions</h2>
                {sessions.length === 0 ? (
                    <p style={{ color: "#666" }}>まだセッションがありません</p>
                ) : (
                    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
                        {sessions.map((s) => {
                            const end =
                                s.endedAt ??
                                (s.status === "paused" ? s.pausedAt ?? s.startedAt : Date.now());
                            const ms = end - s.startedAt;

                            const label = s.endedAt
                                ? "DONE"
                                : s.status === "running"
                                ? "RUNNING"
                                : "PAUSED";

                            return (
                                <li
                                    key={s.id}
                                    style={{
                                        border: "1px solid #ddd",
                                        borderRadius: 12,
                                        padding: 12,
                                        opacity: s.endedAt ? 0.95 : 1,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatMs(ms)}</strong>

                                        <span
                                            style={{
                                                fontSize: 12,
                                                padding: "2px 8px",
                                                borderRadius: 999,
                                                border: "1px solid #999",
                                            }}
                                        >
                                            {label}
                                        </span>
                                    </div>

                                    <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                                        {new Date(s.startedAt).toLocaleString()}
                                        {s.endedAt ? ` → ${new Date(s.endedAt).toLocaleString()}` : ""}
                                    </div>

                                    {s.note?.trim() ? (
                                        <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{s.note}</p>
                                    ) : (
                                        <p style={{ marginTop: 8, color: "#999" }}>（メモなし）</p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <CommitModal
                open={isCommitOpen}
                draft={draftCommit}
                onChange={setDraftCommit}
                onCancel={() => {
                    // Stopしたけど保存しない＝とりあえずPAUSEDにして戻す（データは残る）
                    // ここは好みで「元の状態に戻す（RUNNINGにする）」でもOK
                    finalizeAndClose();
                }}
                onSave={() => {
                    if (!draftCommit || !projectId) return;

                    // commitsに保存（プロジェクト画面で読む用）
                    addCommit({
                        id: uid(),
                        projectId,
                        startedAt: draftCommit.startedAt,
                        endedAt: draftCommit.endedAt,
                        durationMs: draftCommit.endedAt - draftCommit.startedAt,
                        note: draftCommit.note,
                    });

                    // sessions側も終了で確定（履歴に残す）
                    finalizeStopSession();

                    finalizeAndClose();
                    navigate("/projects");
                }}
                onSaveAndContinue={() => {
                    if (!draftCommit || !projectId) return;

                    addCommit({
                        id: uid(),
                        projectId,
                        startedAt: draftCommit.startedAt,
                        endedAt: draftCommit.endedAt,
                        durationMs: draftCommit.endedAt - draftCommit.startedAt,
                        note: draftCommit.note,
                    });

                    finalizeStopSession();
                    finalizeAndClose();

                    // 次を即開始（同じproject）
                    startWithProject(projectId);
                }}
            />
        </main>
    );
}