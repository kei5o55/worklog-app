import { useState, } from "react";
import type { ChangeEvent,FormEvent } from "react";
import type { User } from "../logic/types";

type Props = {
  open: boolean;
  onClose: () => void;
  currentUser?: User; // 初期値として渡す既存のユーザーデータ
  onSubmit: (formData: FormData) => Promise<void> | void; // 親コンポーネントへ送信する関数
};

export default function UserProfileModal({
  open,
  onClose,
  currentUser,
  onSubmit,
}: Props) {
  // フォームの状態
  const [name, setName] = useState(currentUser?.name ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [bgmUrl, setBgmUrl] = useState(currentUser?.bgmUrl ?? "");

  // 画像プレビュー用
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentUser?.icon ?? null
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  // 画像選択時のプレビュー生成
  const handleIconChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // フォーム送信処理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Active Storage 連携を考慮し FormData で送れるように構築
      const formData = new FormData();
      formData.append("user[name]", name);
      formData.append("user[bio]", bio);
      formData.append("user[bgm_url]", bgmUrl);
      if (iconFile) {
        formData.append("user[icon]", iconFile);
      }

      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6 my-8 text-slate-800">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            プロフィール編集
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* アイコン画像設定 */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 grid place-items-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Icon Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-slate-400 text-xs">No Icon</span>
              )}
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                画像をえらぶ
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIconChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-400 mt-1">
                JPG, PNG, GIF に対応
              </p>
            </div>
          </div>

          {/* 名前 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              ユーザー名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="表示名を入力"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-sm"
            />
          </div>

          {/* 自己紹介（bio） */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              自己紹介
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="好きな技術や日常について"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-sm resize-none"
            />
          </div>

          {/* 作業用BGM用リンク */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              作業用BGMリンク
            </label>
            <input
              type="url"
              value={bgmUrl}
              onChange={(e) => setBgmUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-sm"
            />
            <p className="text-xs text-slate-400">
              YouTubeやSoundCloudなどの共有リンク
            </p>
          </div>

          {/* フッターアクション */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}