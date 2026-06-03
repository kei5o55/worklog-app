//src/pages/TimerPage.tsx
// ここはタイマーのページ。作業時間の計測やコミットの保存などを行う
"use client"
import { useEffect, useMemo, useRef, useState } from "react";
import type { DraftCommit } from "../../../components/CommitModal";
import CommitModal from "../../../components/CommitModal";
import { useNavigate, useParams } from "react-router-dom";
import Link from "next/link"
import {
    loadSessionsIdb,
    saveSessionsIdb,
    loadProjectsIdb,
    loadCommitsIdb,
    addCommitIdb,
} from "../../../logic/storage-idb";//idb用
import {use} from "react"
import type { Project, TimerMode, WorkSession } from "../../..//logic/types";

interface Props{
    params:{id: string};
}

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

function playSE(src: string) {
    const audio = new Audio(src);
    audio.currentTime = 0;
    audio.play().catch(() => {
        // 自動再生制限などで失敗しても落とさない
    });
}

function uid() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TimerPage({params}:{params: Promise<{id:string}>}) {
    const [sessions, setSessions] = useState<WorkSession[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadedOnce, setLoadedOnce] = useState(false);
    const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
    const [phase, setPhase] = useState<TimerMode>("idle");
    const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null);
    const [completedPomodoros, setCompletedPomodoros] = useState(0);
    const [phasePausedAt, setPhasePausedAt] = useState<number | null>(null);
    //const { projectId } = useParams();

    const resolvedParams=use(params);

    const projectId=resolvedParams.id;

    // いまは仮。将来は projectId からプロジェクト名を引く
    const selectedProject = useMemo(() => {
        if (!projectId) return null;
        return projects.find((p) => p.id === projectId) ?? null;
    }, [projectId, projects]);

    useEffect(() => {//初回ロード用
        let cancelled = false;

        async function init() {
            try {
                const [loadedProjects, loadedSessions] = await Promise.all([
                    loadProjectsIdb(),
                    loadSessionsIdb(),
                ]);

                if (cancelled) return;

                setProjects(loadedProjects);
                setSessions(loadedSessions);
                setLoadedOnce(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void init();

        return () => {
            cancelled = true;
        };
    }, []);

    const projectSessions = useMemo(
        () => sessions.filter((s) => s.projectId === projectId),
        [sessions, projectId]
    );
    function isSameLocalDay(t1: number, t2: number) {
        const a = new Date(t1);
        const b = new Date(t2);
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    function sumMs(list: { durationMs: number }[]) {
        return list.reduce((acc, x) => acc + x.durationMs, 0);
    }

    const [draftCommit, setDraftCommit] = useState<DraftCommit | null>(null);
    const [isCommitOpen, setIsCommitOpen] = useState(false);

    const pomodoroWorkMs = (selectedProject?.pomodoroWorkMinutes ?? 25) * 60 * 1000;
    const pomodoroBreakMs = (selectedProject?.pomodoroBreakMinutes ?? 5) * 60 * 1000;

    // 表示用の現在時刻（runningのときだけ更新）
    const [now, setNow] = useState<number>(() => Date.now());

    const activeSession = useMemo(
    () => sessions.find((s) => s.projectId === projectId && s.endedAt == null) ?? null,
    [sessions, projectId]
    );

    const running = useMemo(
    () =>
        sessions.find(
        (s) => s.projectId === projectId && s.endedAt == null && s.status === "running"
        ) ?? null,
    [sessions, projectId]
    );

    const paused = useMemo(
    () =>
        sessions.find(
        (s) => s.projectId === projectId && s.endedAt == null && s.status === "paused"
        ) ?? null,
    [sessions, projectId]
    );

    const [note, setNote] = useState<string>(activeSession?.note ?? "");

    // activeSessionが切り替わったらメモ欄を同期
    useEffect(() => {
        setNote(activeSession?.note ?? "");
    }, [activeSession?.id]);

    // sessionsが変わったら永続化
    useEffect(() => {
        if (!loadedOnce) return;
        void saveSessionsIdb(sessions);
    }, [sessions, loadedOnce]);

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

    const currentPhaseElapsedMs = useMemo(() => {
        if (!phaseStartedAt) return 0;
        return now - phaseStartedAt;
    }, [now, phaseStartedAt]);

    const currentPhaseDurationMs = phase === "break" ? pomodoroBreakMs : pomodoroWorkMs;

    const currentPhaseRemainingMs = Math.max(
        0,
        currentPhaseDurationMs - currentPhaseElapsedMs
    );

    useEffect(() => {
        if (!pomodoroEnabled) return;
        if (!activeSession) return;
        if (activeSession.status !== "running") return;
        if (phase === "idle") return;

        if (currentPhaseRemainingMs > 0) return;

        const nowTs = Date.now();
        setNow(nowTs);

        if (phase === "work") {
            playSE("/sounds/se.mp3");
            setCompletedPomodoros((v) => v + 1);
            setPhase("break");
            setPhaseStartedAt(nowTs);
            return;
        }

        if (phase === "break") {
            playSE("/sounds/se.mp3");
            setPhase("work");
            setPhaseStartedAt(nowTs);
        }
    }, [
        pomodoroEnabled,
        activeSession,
        phase,
        currentPhaseRemainingMs,
    ]);

    const confirmLeaveIfNeeded = () => {
        if (!activeSession) return true;
        return window.confirm("現在の作業が終了していません。ページを離れますか？");
    };

    const handleBackToProjects = () => {
        if (!confirmLeaveIfNeeded()) return;
        <Link href="/"></Link>
    };

    // --- 一時停止/再開 ---
    const pause = () => {
        if (!running) return;
        const pausedAt = Date.now();

        setNow(pausedAt);
        if (pomodoroEnabled) {
            setPhasePausedAt(pausedAt);
        }

        setSessions((prev) =>
            prev.map((s) =>
            s.id === running.id ? { ...s, status: "paused", pausedAt } : s
            )
        );
    };

    const resume = () => {
        if (!paused) return;

        const pausedAt = paused.pausedAt ?? Date.now();
        const pausedElapsed = pausedAt - paused.startedAt;
        const nowTs = Date.now();

        setNow(nowTs);

        if (pomodoroEnabled && phaseStartedAt && phasePausedAt) {
            const phasePausedElapsed = phasePausedAt - phaseStartedAt;
            setPhaseStartedAt(nowTs - phasePausedElapsed);
            setPhasePausedAt(null);
        }

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

    const start = () => {
        if (!selectedProject) return;

        const nowTs = Date.now();
        setNow(nowTs);

        if (pomodoroEnabled) {
            setPhase("work");
            setPhaseStartedAt(nowTs);
            setCompletedPomodoros(0);
            setPhasePausedAt(null);
        } else {
            setPhase("idle");
            setPhaseStartedAt(null);
            setPhasePausedAt(null);
        }

        startWithProject(selectedProject.id);
    };
    
    const stop = async () => {
        if (!activeSession || !selectedProject) return;

        setPhase("idle");
        setPhaseStartedAt(null);
        setPhasePausedAt(null);

        const endedAt = Date.now();
        const effectiveEnd =
            activeSession.status === "paused"
                ? activeSession.pausedAt ?? endedAt
                : endedAt;

        const durationMs = effectiveEnd - activeSession.startedAt;

        const allCommits = await loadCommitsIdb();
        const projectCommits = allCommits
            .filter((c) => c.projectId === selectedProject.id)
            .sort((a, b) => b.endedAt - a.endedAt);

        const commitNumber = projectCommits.length + 1;
        const projectTotalMs = sumMs(projectCommits) + durationMs;

        const todayTotalMs =
            sumMs(projectCommits.filter((c) => isSameLocalDay(c.endedAt, effectiveEnd))) + durationMs;

        const recentNotes = projectCommits
            .map((c) => (c.note ?? "").trim())
            .filter((n) => n.length > 0)
            .slice(0, 5);

        const draft: DraftCommit = {
            projectId: selectedProject.id,
            projectName: selectedProject.name,
            startedAt: activeSession.startedAt,
            endedAt: effectiveEnd,
            note: activeSession.note ?? "",
            commitNumber,
            todayTotalMs,
            projectTotalMs,
            recentNotes,
            image: null,
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

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!activeSession) return;

            e.preventDefault();
            e.returnValue = "現在の作業が終了していません。";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [activeSession]);

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

    if (loading) {
        return (
            <main style={{ padding: 24 }}>
                <h2>Loading...</h2>
            </main>
        );
    }

    if (!selectedProject) {
        console.log(test);
        return (
            <main style={{ padding: 24 }}>
                
                <h2>Project not found</h2>
            </main>
        );
    }

    return (
        
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
        <button onClick={handleBackToProjects}>←Projectsへ戻る</button>
            <header style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <h1 style={{ fontSize: 22, margin: 0 }}>
                    {selectedProject?.name ?? "Worklog Timer"}
                    </h1>

                    {selectedProject.dueDate ? (
                    <span
                        style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: "#fff3cd",
                        border: "1px solid #f0d98c",
                        }}
                    >
                        納期: {selectedProject.dueDate}
                    </span>
                    ) : null}

                    {selectedProject.pomodoroWorkMinutes ? (
                    <span
                        style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: "#eef6ff",
                        border: "1px solid #c9defa",
                        }}
                    >
                        {selectedProject.pomodoroWorkMinutes}分 / 休憩{" "}
                        {selectedProject.pomodoroBreakMinutes ?? 5}分
                    </span>
                    ) : null}

                    {selectedProject.targetHours ? (
                    <span
                        style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: "#f4f4f4",
                        border: "1px solid #ddd",
                        }}
                    >
                        目標: {selectedProject.targetHours}h
                    </span>
                    ) : null}
                </div>

                {selectedProject.memo?.trim() ? (
                    <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13, color: "#666" }}>
                    {selectedProject.memo}
                    </p>
                ) : null}
                </header>

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
                {pomodoroEnabled && (
                    <div style={{ marginBottom: 12, color: "#555" }}>
                        <div>フェーズ: {phase === "work" ? "作業中" : phase === "break" ? "休憩中" : "停止中"}</div>
                        <div>残り時間: {formatMs(currentPhaseRemainingMs)}</div>
                        <div>完了ポモドーロ数: {completedPomodoros}</div>
                    </div>
                )}

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

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                        type="checkbox"
                        checked={pomodoroEnabled}
                        onChange={(e) => setPomodoroEnabled(e.target.checked)}
                        disabled={!!activeSession}
                        />
                        ポモドーロを使う
                    </label>

                    <div style={{ fontSize: 12, color: "#666" }}>
                        設定: {selectedProject.pomodoroWorkMinutes ?? 25}分 / 休憩{" "}
                        {selectedProject.pomodoroBreakMinutes ?? 5}分
                    </div>
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
                    style={{ resize: "vertical", width: "50%", minHeight: "60px", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} 
                    
                />
                {/* 横にtodoとか置きたいからテキストエリアは５０％で*/}
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

            {/* Sessions一覧（プロジェクト単位） */ }
            <section>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Sessions</h2>

            {projectSessions.length === 0 ? (
                <p style={{ color: "#666" }}>まだセッションがありません</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
                {projectSessions.map((s) => {
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
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatMs(ms)}
                        </strong>

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
                onSave={async () => {
                    if (!draftCommit || !projectId) return;

                    await addCommitIdb({
                        id: uid(),
                        projectId,
                        startedAt: draftCommit.startedAt,
                        endedAt: draftCommit.endedAt,
                        durationMs: draftCommit.endedAt - draftCommit.startedAt,
                        note: draftCommit.note,
                        image: draftCommit.image
                            ? {
                                name: draftCommit.image.name,
                                type: draftCommit.image.type,
                                size: draftCommit.image.size,
                                blob: draftCommit.image.file,
                            }
                            : null,
                    });

                    finalizeStopSession();
                    finalizeAndClose();
                    <Link href="/"></Link>
                }}
                onSaveAndContinue={async () => {
                    if (!draftCommit || !projectId) return;

                    await addCommitIdb({
                        id: uid(),
                        projectId,
                        startedAt: draftCommit.startedAt,
                        endedAt: draftCommit.endedAt,
                        durationMs: draftCommit.endedAt - draftCommit.startedAt,
                        note: draftCommit.note,
                        image: draftCommit.image
                            ? {
                                name: draftCommit.image.name,
                                type: draftCommit.image.type,
                                size: draftCommit.image.size,
                                blob: draftCommit.image.file,
                            }
                            : null,
                    });

                    finalizeStopSession();
                    finalizeAndClose();
                    startWithProject(projectId);
                }}
            />
        </main>
    );
}