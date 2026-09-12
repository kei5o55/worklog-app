import React, { useState, useEffect } from "react";

// 1. 型の定義（Figmaで書けるとTypeScript分かってるアピールになる）
type Item = {
  id: number;
  title: string;
  thumbnailUrl: string;
};

export const Gallery = () => {
  // 2. 「3つの神器」Stateを用意する（表示データ, ローディング, エラー）
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 3. API取得の型（useEffect + async/await）
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("https://api.example.com/items");

        // 💡 面接官が絶対チェックするポイント：HTTPエラーのチェック
        if (!res.ok) {
          throw new Error("APIエラーが発生しました");
        }

        const data: Item[] = await res.json();
        setItems(data);
      } catch (err) {
        // エラーハンドリング
        setError("データの取得に失敗しました");
      } finally {
        // 成功しても失敗してもローディングを終わらせる
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 4. アーリーリターン（ローディング・エラー時の分岐）
  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>{error}</div>;

  // 5. 画面表示（mapで回す）
  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.id}>
          <img src={item.thumbnailUrl} alt={item.title} />
          <p>{item.title}</p>
        </div>
      ))}
    </div>
  );
};