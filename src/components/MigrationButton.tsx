// components/DataMigrationButton.tsx
"use client";

import { useState } from "react";
import { migrateIdbToPostgres } from "../logic/migration";

export function DataMigrationButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleMigrate = async () => {
    if (!window.confirm("ブラウザ内のデータをサーバー（PostgreSQL）へ同期しますか？")) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await migrateIdbToPostgres();

    setLoading(false);
    if (result.success) {
      setMessage(
        `移行完了: プロジェクト ${result.importedProjectsCount}件 / コミット ${result.importedCommitsCount}件`
      );
    } else {
      setMessage(`移行失敗: ${result.error}`);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleMigrate}
        disabled={loading}
        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl transition-colors cursor-pointer"
      >
        {loading ? "データ移行中..." : "ローカルデータをサーバーへ同期"}
      </button>
      {message && <p className="text-xs text-slate-600">{message}</p>}
    </div>
  );
}