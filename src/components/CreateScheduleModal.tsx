import { useState } from "react";
import type { DaySchedule, Project } from "../logic/types";

type Props = {
  open: boolean;
  defaultDate: string;
  projects: Project[];
  existingSchedules: DaySchedule[]; // 重複チェック用の既存予定
  onClose: () => void;
  onAdd: (schedule: DaySchedule) => void | Promise<void>;
};

// 時間と分を比較しやすいように「通算分数（0〜1439）」に変換するヘルパー関数
function toTotalMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

// 通算分数を用いた重複チェック関数
// 条件: (新規開始 < 既存終了) AND (新規終了 > 既存開始)
function checkOverlap(
  existingSchedules: DaySchedule[],
  targetDate: string,
  startMins: number,
  endMins: number
): DaySchedule | undefined {
  return existingSchedules
    .filter((s) => s.date === targetDate)
    .find((s) => {
      const existingStartMins = toTotalMinutes(s.startHour, s.startMinute);
      const existingEndMins = toTotalMinutes(s.endHour, s.endMinute);

      return startMins < existingEndMins && endMins > existingStartMins;
    });
}

// "HH:MM" 形式の文字列を [hour, minute] の数値配列に変換するヘルパー関数
function parseTimeString(timeStr: string): [number, number] {
  const [h, m] = timeStr.split(":").map(Number);
  return [h, m];
}

export default function CreateScheduleModal({
  open,
  defaultDate,
  projects,
  existingSchedules,
  onClose,
  onAdd,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("10:00");
  const [projectId, setProjectId] = useState<string>("");
  const [color, setColor] = useState<string>("#4f46e5");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const [startHour, startMinute] = parseTimeString(startTimeStr);
    const [endHour, endMinute] = parseTimeString(endTimeStr);

    const startMins = toTotalMinutes(startHour, startMinute);
    const endMins = toTotalMinutes(endHour, endMinute);

    // 1. 開始/終了時間の基本チェック
    if (startMins >= endMins) {
      setErrorMsg("終了時間は開始時間より後に設定してください。");
      return;
    }

    // 2. 時間重複チェック
    const overlapped = checkOverlap(existingSchedules, date, startMins, endMins);
    if (overlapped) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const existStart = `${pad(overlapped.startHour)}:${pad(overlapped.startMinute)}`;
      const existEnd = `${pad(overlapped.endHour)}:${pad(overlapped.endMinute)}`;

      setErrorMsg(
        `指定した時間帯は「${overlapped.title}」（${existStart}〜${existEnd}）と重複しています。`
      );
      return;
    }

    // 3. DaySchedule オブジェクトの構築
    const newSchedule: DaySchedule = {
      id: crypto.randomUUID(),
      date,
      title,
      startHour,
      startMinute,
      endHour,
      endMinute,
      color: color || undefined,
      projectId: projectId || undefined,
    };

    await onAdd(newSchedule);

    // フォーム初期化 & 閉じる
    setTitle("");
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">予定を追加</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700">タイトル</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
              placeholder="例: 機能開発、ミーティング"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">日付</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">開始時間</label>
              <input
                type="time"
                required
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">終了時間</label>
              <input
                type="time"
                required
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">紐づけるプロジェクト (任意)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="">なし</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">カラー (任意)</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 h-9 w-16 cursor-pointer rounded-lg border border-gray-300 p-1"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                onClose();
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
            >
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}