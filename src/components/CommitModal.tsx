import { useMemo, useState } from "react";

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
  commitNumber: number; // 何回目
  todayTotalMs: number; // 今日累計
  projectTotalMs: number; // プロジェクト累計
  recentNotes: string[]; // 過去メモ（直近）

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
  mode?: "timer" | "direct"; // ← モード判定用フラグを追加（デフォルトはtimer）
  onChange: (next: DraftCommit) => void;

  onSave: () => void;
  onSaveAndContinue: () => void;
  onCancel: () => void;
};

export default function CommitModal({
  open,
  draft,
  mode = "timer",
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
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
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
      className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs grid place-items-center p-4 z-50 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 border border-zinc-200 shadow-xl my-8 font-sans text-zinc-800 animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="flex items-baseline gap-3 pb-4 border-b border-zinc-100">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            {mode === "direct" ? "ダイレクトコミット" : "作業コミット"}
          </h2>
          <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
            {draft.projectName} / #{draft.commitNumber}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {/* 統計表示 */}
          <div className="grid grid-cols-3 gap-3">
            {/* モードによって「今回」の表示を切り替え */}
            {mode === "direct" ? (
              <div className="p-3 rounded-xl border bg-sky-50/40 border-sky-200">
                <div className="text-xs font-semibold text-zinc-500 mb-1">
                  作業時間 (分)
                </div>
                <div className="flex items-end gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={Math.floor(durationMs / 60000)} // ms を 分 に変換して表示
                    onChange={(e) => {
                      // 1. 空文字の場合は一旦 0 にする
                      const rawVal = parseInt(e.target.value, 10);
                      
                      // 入力途中で空文字（BackSpace全消し）を許容したい場合はここでガード
                      if (isNaN(rawVal)) {
                        onChange({
                          ...draft,
                          startedAt: draft.endedAt, // 0分にする
                        });
                        return;
                      }

                      // 2. 1 〜 10000 の範囲に収める（クランプ処理）
                      const mins = Math.min(10000, Math.max(1, rawVal));

                      // 3. 入力された分から逆算して startedAt を上書きする
                      onChange({
                        ...draft,
                        startedAt: draft.endedAt - mins * 60000,
                      });
                    }}
                    className="w-20 bg-white border border-sky-200 rounded-md px-2 py-0.5 text-lg font-mono font-bold text-zinc-900 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 tabular-nums"
                  />
                  <span className="text-sm font-bold text-zinc-700 pb-0.5">
                    分
                  </span>
                </div>
              </div>
            ) : (
              <Stat label="今回" value={formatMs(durationMs)} highlight />
            )}

            <Stat label="今日累計" value={formatMs(draft.todayTotalMs)} />
            <Stat label="累計" value={formatMs(draft.projectTotalMs)} />
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            {new Date(draft.startedAt).toLocaleString()} →{" "}
            {new Date(draft.endedAt).toLocaleString()}
          </div>

          {/* メモ入力 */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              今日のまとめメモ
            </label>
            <textarea
              value={draft.note}
              onChange={(e) => onChange({ ...draft, note: e.target.value })}
              rows={4}
              placeholder="例：線画の修正 / 目の形を調整 / 背景ラフ"
              className="w-full text-sm p-3 rounded-xl border border-zinc-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none resize-y transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* 画像添付 */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              進捗画像
            </label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 transition-colors cursor-pointer"
              onChange={async (e) => {
                const input = e.currentTarget; // ★ await 前に要素の参照を保持
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

                input.value = ""; // ★ 退避しておいた変数に対して操作する
              }}
            />

            {draft.image && (
              <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 inline-block">
                <img
                  src={draft.image.previewUrl}
                  alt={draft.image.name}
                  className="w-44 h-44 object-cover rounded-lg border border-zinc-200"
                />
                <div className="mt-2 text-xs text-zinc-500 truncate max-w-[176px]">
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
                  className="mt-2 w-full text-xs font-medium py-1.5 px-2.5 text-red-600 bg-white hover:bg-red-50 border border-zinc-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                >
                  画像を外す
                </button>
              </div>
            )}
          </div>

          {/* 過去メモ展開 */}
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
            >
              {expanded ? "過去メモを隠す" : "過去メモを見る"}
            </button>

            {expanded && (
              <div className="mt-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700">
                {draft.recentNotes.length === 0 ? (
                  <div className="text-zinc-400 italic">
                    まだ過去メモがありません
                  </div>
                ) : (
                  <ul className="list-disc list-inside space-y-1.5">
                    {draft.recentNotes.map((n, i) => (
                      <li
                        key={i}
                        className="whitespace-pre-wrap leading-relaxed"
                      >
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* フッターアクション */}
        <div className="flex items-center justify-between gap-2 mt-8 pt-4 border-t border-zinc-100 flex-wrap">
          <button
            onClick={onCancel}
            className="text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 py-2 px-4 rounded-xl transition-colors cursor-pointer"
          >
            キャンセル
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onSave}
              className="text-sm font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 py-2 px-4 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              {mode === "direct" ? "保存する" : "保存して終了"}
            </button>
            {/* ダイレクトコミット時は「保存して続ける（タイマー継続）」ボタンを隠す */}
            {mode === "timer" && (
              <button
                onClick={onSaveAndContinue}
                className="text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 py-2 px-4 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                保存して続ける
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-xl border ${
        highlight
          ? "bg-sky-50/40 border-sky-200"
          : "bg-zinc-50/60 border-zinc-200"
      }`}
    >
      <div className="text-xs font-semibold text-zinc-500 mb-0.5">{label}</div>
      <div className="text-base sm:text-lg font-mono font-bold text-zinc-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}