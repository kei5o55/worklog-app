import { useEffect, useMemo, useState } from "react";

export type NewProjectInput = {
  name: string;
  dueDate: string; // "" or "YYYY-MM-DD"
  memo: string;
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

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  // 開いたときにフォーム初期化
  useEffect(() => {
    if (!open) return;
    setName("");
    setDueDate("");
    setMemo("");
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!canCreate) return;
    onCreate({ name, dueDate, memo });
  };

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
        // 背景クリックで閉じる
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          background: "white",
          borderRadius: 14,
          padding: 16,
          border: "1px solid #ddd",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>新規プロジェクト</h2>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
              名前（必須）
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：関西コミティア新刊 / MISORIA画集"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
              納期（任意）
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "fit-content",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
            <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
              入稿締切やイベント日など、ひとまず1つだけ登録
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
              メモ（任意）
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：仕様、やること、注意点、リンクなど"
              rows={4}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ padding: "10px 14px", borderRadius: 10 }}>
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={!canCreate}
            style={{ marginLeft: "auto", padding: "10px 14px", borderRadius: 10 }}
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}