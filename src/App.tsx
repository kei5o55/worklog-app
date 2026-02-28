import { useEffect, useMemo, useRef, useState } from "react";

type WorkSession = {
  id: string;
  startedAt: number; // epoch ms
  endedAt?: number;  // epoch ms
  note: string;
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
  // crypto.randomUUID() があればそれ優先
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

export default function App() {
  const [sessions, setSessions] = useState<WorkSession[]>(() => loadSessions());

  // 稼働中セッション（endedAtがない最新）を探す
  const running = useMemo(() => sessions.find((s) => s.endedAt == null), [sessions]);

  const [note, setNote] = useState<string>(running?.note ?? "");

  // 表示用の現在時刻（稼働中だけ1秒更新）
  const [now, setNow] = useState<number>(() => Date.now());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    // 稼働中のみtick
    tickRef.current = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [running]);

  // runningが変わったらnote欄を同期（新規開始時など）
  useEffect(() => {
    setNote(running?.note ?? "");
  }, [running?.id]);

  // sessionsが変わったら永続化
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const elapsedMs = useMemo(() => {
    if (!running) return 0;
    return (running.endedAt ?? now) - running.startedAt;
  }, [running, now]);

  const start = () => {
    if (running) return;
    const s: WorkSession = { id: uid(), startedAt: Date.now(), note: "" };
    setSessions((prev) => [s, ...prev]);
  };

  const stop = () => {
    if (!running) return;
    const endedAt = Date.now();
    setSessions((prev) =>
      prev.map((s) => (s.id === running.id ? { ...s, endedAt, note } : s))
    );
  };

  const updateRunningNote = (value: string) => {
    setNote(value);
    if (!running) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === running.id ? { ...s, note: value } : s))
    );
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const clearAll = () => {
    if (!confirm("全部消す？（戻せない）")) return;
    setSessions([]);
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
          {formatMs(elapsedMs)}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={start}
            disabled={!!running}
            style={{ padding: "10px 14px", borderRadius: 10 }}
          >
            Start
          </button>
          <button
            onClick={stop}
            disabled={!running}
            style={{ padding: "10px 14px", borderRadius: 10 }}
          >
            Stop
          </button>
          <button onClick={clearAll} style={{ marginLeft: "auto", padding: "10px 14px", borderRadius: 10 }}>
            Clear
          </button>
        </div>

        <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
          メモ（稼働中のセッションに保存）
        </label>
        <textarea
          value={note}
          onChange={(e) => updateRunningNote(e.target.value)}
          placeholder={running ? "今やってる作業を書いておく" : "Startしたら入力できる"}
          disabled={!running}
          rows={3}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          {running ? `Started: ${new Date(running.startedAt).toLocaleString()}` : "Not running"}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Sessions</h2>
        {sessions.length === 0 ? (
          <p style={{ color: "#666" }}>まだセッションがありません</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
            {sessions.map((s) => {
              const ms = (s.endedAt ?? Date.now()) - s.startedAt;
              const isRunning = s.endedAt == null;
              return (
                <li
                  key={s.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 12,
                    opacity: isRunning ? 1 : 0.95,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatMs(ms)}
                    </strong>
                    {isRunning && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #999",
                        }}
                      >
                        RUNNING
                      </span>
                    )}
                    <button
                      onClick={() => deleteSession(s.id)}
                      style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 10 }}
                      disabled={isRunning}
                      title={isRunning ? "稼働中は削除できない" : "削除"}
                    >
                      Delete
                    </button>
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
    </main>
  );
}