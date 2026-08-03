//src/components/CreateProjectModal.tsx
// ここはプロジェクト作成用のモーダル。ProjectsPageから呼び出す
import { useEffect, useMemo, useState } from "react";

export type NewProjectInput = {
  name: string;
  dueDate: string;
  memo: string;
  targetHours: string; // "" or "10" みたいな文字列で受ける
  pomodoroWorkMinutes?: string; // "" or "25" みたいな文字列で受ける(ないときはポモドーロオフとか)
  pomodoroBreakMinutes?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
};

export default function CreateProjectModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [targetHours, setTargetHours] = useState<string | number>("");
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState<
    string | number
  >("");
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState<
    string | number
  >("");
  function toHalfWidth(str: string) {
    return str.replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0),
    );
  }

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  // 開いたときにフォーム初期化
  useEffect(() => {
    if (!open) return;
    setName("");
    setDueDate("");
    setMemo("");
    setTargetHours("");
    setPomodoroWorkMinutes("");
    setPomodoroBreakMinutes("");
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!canCreate) return;
    onCreate({
      name,
      dueDate,
      memo,
      targetHours: String(targetHours),
      pomodoroWorkMinutes: String(pomodoroWorkMinutes),
      pomodoroBreakMinutes: String(pomodoroBreakMinutes),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
      onMouseDown={(e) => {
        // 背景クリックで閉じる
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xl font-bold text-slate-900">新規プロジェクト</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              名前（必須）
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：COMITIA新刊"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                納期（任意）
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              <div className="text-[11px] text-slate-400 mt-1">
                入稿締切やイベント日など
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                目標時間（任意 / 時間）
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={targetHours}
                onChange={(e) => {
                  const raw = toHalfWidth(e.target.value);

                  if (raw === "") {
                    setTargetHours("");
                    return;
                  }

                  const n = Number(raw);
                  if (Number.isFinite(n) && n > 0) {
                    setTargetHours(n);
                  }
                }}
                placeholder="例: 10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ポモドーロ作業時間（任意 / 分）
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={pomodoroWorkMinutes}
                onChange={(e) => {
                  const raw = toHalfWidth(e.target.value);
                  if (raw === "") {
                    setPomodoroWorkMinutes("");
                    return;
                  }
                  const n = Number(raw);
                  if (Number.isFinite(n) && n > 0) {
                    setPomodoroWorkMinutes(n);
                  }
                }}
                placeholder="例: 25"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                休憩時間（任意 / 分）
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={pomodoroBreakMinutes}
                onChange={(e) => {
                  const raw = toHalfWidth(e.target.value);
                  if (raw === "") {
                    setPomodoroBreakMinutes("");
                    return;
                  }
                  const n = Number(raw);
                  if (Number.isFinite(n) && n > 0) {
                    setPomodoroBreakMinutes(n);
                  }
                }}
                placeholder="例: 5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              メモ（任意）
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：仕様、やること、注意点、リンクなど"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={!canCreate}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}