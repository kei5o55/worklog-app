//src/pages/TimerPage.tsx
"use client";
import { useEffect, useMemo, useRef, useState, use } from "react";
import type { DraftCommit } from "../../../components/CommitModal";
import CommitModal from "../../../components/CommitModal";
import {
  loadSessionsIdb,
  saveSessionsIdb,
  loadProjectsIdb,
  loadCommitsIdb,
  addCommitIdb,
} from "../../../logic/storage-idb";
import { useRouter } from "next/navigation";
import type { Project, TimerMode, WorkSession } from "../../../logic/types";

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
  audio.play().catch(() => {});
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TimerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [phase, setPhase] = useState<TimerMode>("idle");
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [phasePausedAt, setPhasePausedAt] = useState<number | null>(null);

  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const selectedProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId) ?? null;
  }, [projectId, projects]);

  useEffect(() => {
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

  const pomodoroWorkMs =
    (selectedProject?.pomodoroWorkMinutes ?? 25) * 60 * 1000;
  const pomodoroBreakMs =
    (selectedProject?.pomodoroBreakMinutes ?? 5) * 60 * 1000;

  const [now, setNow] = useState<number>(() => Date.now());

  const activeSession = useMemo(
    () =>
      sessions.find((s) => s.projectId === projectId && s.endedAt == null) ??
      null,
    [sessions, projectId]
  );

  const running = useMemo(
    () =>
      sessions.find(
        (s) =>
          s.projectId === projectId &&
          s.endedAt == null &&
          s.status === "running"
      ) ?? null,
    [sessions, projectId]
  );

  const paused = useMemo(
    () =>
      sessions.find(
        (s) =>
          s.projectId === projectId &&
          s.endedAt == null &&
          s.status === "paused"
      ) ?? null,
    [sessions, projectId]
  );

  const [note, setNote] = useState<string>(activeSession?.note ?? "");

  useEffect(() => {
    setNote(activeSession?.note ?? "");
  }, [activeSession?.id]);

  useEffect(() => {
    if (!loadedOnce) return;
    void saveSessionsIdb(sessions);
  }, [sessions, loadedOnce]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const currentElapsedMs = useMemo(() => {
    const s = activeSession;
    if (!s) return 0;

    if (s.status === "paused") {
      const end = s.pausedAt ?? now;
      return end - s.startedAt;
    }
    return now - s.startedAt;
  }, [activeSession, now]);

  const currentPhaseElapsedMs = useMemo(() => {
    if (!phaseStartedAt) return 0;
    return now - phaseStartedAt;
  }, [now, phaseStartedAt]);

  const currentPhaseDurationMs =
    phase === "break" ? pomodoroBreakMs : pomodoroWorkMs;

  const currentPhaseRemainingMs = Math.max(
    0,
    currentPhaseDurationMs - currentPhaseElapsedMs
  );

  useEffect(() => {
    if (
      !pomodoroEnabled ||
      !activeSession ||
      activeSession.status !== "running" ||
      phase === "idle"
    ) {
      return;
    }

    if (currentPhaseRemainingMs > 0) return;

    const nowTs = Date.now();

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
  }, [pomodoroEnabled, activeSession, phase, currentPhaseRemainingMs]);

  const confirmLeaveIfNeeded = () => {
    if (!activeSession) return true;
    return window.confirm(
      "現在の作業が終了していません。ページを離れますか？"
    );
  };

  const router = useRouter();
  const handleBackToProjects = () => {
    if (!confirmLeaveIfNeeded()) return;
    router.push("/");
  };

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

  const startWithProject = (pid: string) => {
    if (activeSession) return;
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
        ? (activeSession.pausedAt ?? endedAt)
        : endedAt;

    const durationMs = effectiveEnd - activeSession.startedAt;

    const allCommits = await loadCommitsIdb();
    const projectCommits = allCommits
      .filter((c) => c.projectId === selectedProject.id)
      .sort((a, b) => b.endedAt - a.endedAt);

    const commitNumber = projectCommits.length + 1;
    const projectTotalMs = sumMs(projectCommits) + durationMs;

    const todayTotalMs =
      sumMs(
        projectCommits.filter((c) => isSameLocalDay(c.endedAt, effectiveEnd))
      ) + durationMs;

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

  const runningRef = useRef<WorkSession | null>(null);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    return () => {
      const r = runningRef.current;
      if (!r) return;
      const pausedAt = Date.now();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === r.id ? { ...s, status: "paused", pausedAt } : s
        )
      );
    };
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

  const finalizeAndClose = () => {
    setIsCommitOpen(false);
    setDraftCommit(null);
  };

  const finalizeStopSession = () => {
    if (!activeSession || !draftCommit) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              endedAt: draftCommit.endedAt,
              status: "paused",
              pausedAt: undefined,
            }
          : s
      )
    );
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-6 font-sans text-zinc-800">
        <div className="flex items-center justify-center min-h-[200px] text-zinc-500 text-sm">
          Loading...
        </div>
      </main>
    );
  }

  if (!selectedProject) {
    return (
      <main className="max-w-2xl mx-auto p-6 font-sans text-zinc-800">
        <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-700">Project not found</h2>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            ← Projects一覧へ戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 font-sans text-zinc-800">
      <button
        onClick={handleBackToProjects}
        className="inline-flex items-center text-sm font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900 py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer mb-6"
      >
        ← Projectsへ戻る
      </button>

      <header className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {selectedProject.name}
          </h1>

          {selectedProject.dueDate && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
              納期: {selectedProject.dueDate}
            </span>
          )}

          {selectedProject.pomodoroWorkMinutes && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60">
              {selectedProject.pomodoroWorkMinutes}分 / 休憩{" "}
              {selectedProject.pomodoroBreakMinutes ?? 5}分
            </span>
          )}

          {selectedProject.targetHours && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              目標: {selectedProject.targetHours}h
            </span>
          )}
        </div>

        {selectedProject.memo?.trim() && (
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
            {selectedProject.memo}
          </p>
        )}
      </header>

      {/* メインタイマーエリア */}
      <section className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm mb-8">
        <div className="text-5xl font-mono font-bold tracking-tight text-zinc-900 mb-4 tabular-nums">
          {formatMs(currentElapsedMs)}
        </div>

        {pomodoroEnabled && (
          <div className="mb-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-700">フェーズ:</span>
              <span
                className={`font-medium px-2 py-0.5 rounded ${
                  phase === "work"
                    ? "bg-emerald-100 text-emerald-800"
                    : phase === "break"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {phase === "work"
                  ? "作業中"
                  : phase === "break"
                  ? "休憩中"
                  : "停止中"}
              </span>
            </div>
            <div>
              残り時間:{" "}
              <span className="font-mono font-semibold">
                {formatMs(currentPhaseRemainingMs)}
              </span>
            </div>
            <div>完了ポモドーロ数: {completedPomodoros}</div>
          </div>
        )}

        {/* コントロールボタン */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={start}
            disabled={!!activeSession}
            className="text-sm px-4 py-2 font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Start
          </button>

          <button
            onClick={pause}
            disabled={!running}
            className="text-sm px-4 py-2 font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Pause
          </button>

          <button
            onClick={resume}
            disabled={!paused}
            className="text-sm px-4 py-2 font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Resume
          </button>

          <button
            onClick={stop}
            disabled={!activeSession}
            className="text-sm px-4 py-2 font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Stop
          </button>

          <button
            onClick={clearAll}
            className="text-sm px-3 py-2 font-medium text-zinc-400 hover:text-red-500 hover:bg-zinc-50 rounded-lg ml-auto transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* ポモドーロ切り替え */}
        <div className="flex items-center gap-3 mb-5 text-sm">
          <label className="flex items-center gap-2 font-medium text-zinc-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pomodoroEnabled}
              onChange={(e) => setPomodoroEnabled(e.target.checked)}
              disabled={!!activeSession}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-zinc-300 cursor-pointer disabled:opacity-50"
            />
            ポモドーロを使う
          </label>

          <span className="text-xs text-zinc-400">
            (設定: {selectedProject.pomodoroWorkMinutes ?? 25}分 / 休憩{" "}
            {selectedProject.pomodoroBreakMinutes ?? 5}分)
          </span>
        </div>

        {/* メモ入力 */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1.5">
            メモ（稼働中/一時停止中のセッションに保存）
          </label>
          <textarea
            value={note}
            onChange={(e) => updateActiveNote(e.target.value)}
            placeholder={
              activeSession
                ? "今やってる作業を書いておく"
                : "Startしたら入力できる"
            }
            disabled={!activeSession}
            rows={3}
            className="w-full text-sm p-3 rounded-xl border border-zinc-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none resize-y disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all"
          />
        </div>

        <div className="mt-3 text-xs text-zinc-400 flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              activeSession
                ? activeSession.status === "running"
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-amber-500"
                : "bg-zinc-300"
            }`}
          />
          {activeSession ? (
            <>
              Started: {new Date(activeSession.startedAt).toLocaleString()}{" "}
              <span className="font-semibold uppercase text-zinc-600">
                [{activeSession.status}]
              </span>
            </>
          ) : (
            "Not running"
          )}
        </div>
      </section>

      {/* Sessions一覧 */}
      <section>
        <h2 className="text-base font-bold text-zinc-900 mb-3">Sessions</h2>

        {projectSessions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl">
            まだセッションがありません
          </div>
        ) : (
          <ul className="space-y-3">
            {projectSessions.map((s) => {
              const end =
                s.endedAt ??
                (s.status === "paused"
                  ? (s.pausedAt ?? s.startedAt)
                  : Date.now());
              const ms = end - s.startedAt;

              const isDone = !!s.endedAt;
              const isRunning = s.status === "running" && !isDone;

              return (
                <li
                  key={s.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isRunning
                      ? "bg-sky-50/30 border-sky-200 shadow-sm"
                      : "bg-white border-zinc-200 opacity-90"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <strong className="text-lg font-mono font-bold text-zinc-800 tabular-nums">
                      {formatMs(ms)}
                    </strong>

                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        isDone
                          ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          : isRunning
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {isDone ? "DONE" : isRunning ? "RUNNING" : "PAUSED"}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 mb-2">
                    {new Date(s.startedAt).toLocaleString()}
                    {s.endedAt
                      ? ` → ${new Date(s.endedAt).toLocaleString()}`
                      : ""}
                  </div>

                  {s.note?.trim() ? (
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-100">
                      {s.note}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">（メモなし）</p>
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
          router.push("/");
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