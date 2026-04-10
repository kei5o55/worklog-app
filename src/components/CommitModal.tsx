import React, { useMemo, useState } from "react";

export type DraftCommitImage = {
    name: string;
    type: string;
    size: number;
    file: File;
    previewUrl: string;
};

export type DraftCommit = {
    projectId: string;
    projectName: string;
    startedAt: number;
    endedAt: number;
    note: string;

    // 表示用（App側で計算して渡す）
    commitNumber: number;      // 何回目
    todayTotalMs: number;      // 今日累計
    projectTotalMs: number;    // プロジェクト累計
    recentNotes: string[];     // 過去メモ（直近）

    image?: DraftCommitImage | null;
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

type Props = {
    open: boolean;
    draft: DraftCommit | null;
    onChange: (next: DraftCommit) => void;

    onSave: () => void;
    onSaveAndContinue: () => void;
    onCancel: () => void;
};

export default function CommitModal({
    open,
    draft,
    onChange,
    onSave,
    onSaveAndContinue,
    onCancel,
}: Props) {
    const [expanded, setExpanded] = useState(false);

    const durationMs = useMemo(() => {
        if (!draft) return 0;
        return draft.endedAt - draft.startedAt;
    }, [draft]);

    if (!open || !draft) return null;

    async function compressImage(file: File): Promise<File> {
        const img = new Image();
        const url = URL.createObjectURL(file);

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        const maxWidth = 1280; // 横幅制限
        const scale = Math.min(1, maxWidth / img.width);

        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob: Blob = await new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8) // 画質80%
        );

        URL.revokeObjectURL(url);

        return new File([blob], file.name, {
            type: "image/jpeg",
        });
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "grid",
                placeItems: "center",
                padding: 16,
                zIndex: 50,
            }}
            onMouseDown={(e) => {
                // 背景クリックで閉じる（誤爆嫌なら消してOK）
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                style={{
                    width: "min(760px, 100%)",
                    background: "white",
                    borderRadius: 14,
                    padding: 16,
                    border: "1px solid #ddd",
                }}
            >
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>作業コミット</h2>
                    <div style={{ color: "#666", fontSize: 12 }}>
                        {draft.projectName} / #{draft.commitNumber}
                    </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Stat label="今回" value={formatMs(durationMs)} />
                        <Stat label="今日累計" value={formatMs(draft.todayTotalMs)} />
                        <Stat label="累計" value={formatMs(draft.projectTotalMs)} />
                    </div>

                    <div style={{ fontSize: 12, color: "#666" }}>
                        {new Date(draft.startedAt).toLocaleString()} → {new Date(draft.endedAt).toLocaleString()}
                    </div>

                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>
                        今日のまとめメモ
                    </label>
                    <textarea
                        value={draft.note}
                        onChange={(e) => onChange({ ...draft, note: e.target.value })}
                        rows={4}
                        placeholder="例：線画の修正 / 目の形を調整 / 背景ラフ"
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                    />

                    <label style={{ display: "block", fontSize: 12, color: "#555" }}>
                        進捗画像
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (!file.type.startsWith("image/")) {
                                alert("画像ファイルを選択してください");
                                return;
                            }

                            const compressed = await compressImage(file);

                            if (draft.image?.previewUrl) {
                                URL.revokeObjectURL(draft.image.previewUrl);
                            }

                            onChange({
                                ...draft,
                                image: {
                                    name: compressed.name,
                                    type: compressed.type,
                                    size: compressed.size,
                                    file: compressed,
                                    previewUrl: URL.createObjectURL(compressed),
                                },
                            });

                            e.currentTarget.value = "";
                        }}
                    />

                    {draft.image && (
                        <div
                            style={{
                                marginTop: 10,
                                border: "1px solid #eee",
                                borderRadius: 10,
                                padding: 10,
                                width: "fit-content",
                            }}
                        >
                            <img
                                src={draft.image.previewUrl}
                                alt={draft.image.name}
                                style={{
                                    width: 180,
                                    height: 180,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                    display: "block",
                                }}
                            />

                            <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                {draft.image.name}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (draft.image?.previewUrl) {
                                        URL.revokeObjectURL(draft.image.previewUrl);
                                    }

                                    onChange({
                                        ...draft,
                                        image: null,
                                    });
                                }}
                                style={{ marginTop: 8, padding: "6px 10px", borderRadius: 10 }}
                            >
                                画像を外す
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        style={{ width: "fit-content", padding: "6px 10px", borderRadius: 10 }}
                    >
                        {expanded ? "過去メモを隠す" : "過去メモを見る"}
                    </button>

                    {expanded && (
                        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                            {draft.recentNotes.length === 0 ? (
                                <div style={{ color: "#888", fontSize: 12 }}>まだメモがありません</div>
                            ) : (
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {draft.recentNotes.map((n, i) => (
                                        <li key={i} style={{ marginBottom: 6, whiteSpace: "pre-wrap" }}>
                                            {n}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={onCancel} style={{ padding: "10px 14px", borderRadius: 10 }}>
                        キャンセル
                    </button>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button onClick={onSave} style={{ padding: "10px 14px", borderRadius: 10 }}>
                            保存して終了
                        </button>
                        <button
                            onClick={onSaveAndContinue}
                            style={{ padding: "10px 14px", borderRadius: 10 }}
                        >
                            保存して続ける
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: "8px 10px", minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#666" }}>{label}</div>
            <div style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{value}</div>
        </div>
    );
}