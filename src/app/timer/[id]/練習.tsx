import React, { useState, useEffect } from "react";

// --- APIから返ってくるデータの型定義 ---
type Item = {
  id: number;
  title: string;
  url: string;
  thumbnailUrl: string;
};

export const ArtGallery = () => {
  // TODO 1: 必要な State を定義してください（items, loading, error など）
  const [items,setItems]=useState();
  const [loading,setLoading]=useState("true"); 

  useEffect(() => {
    // TODO 2: API（https://jsonplaceholder.typicode.com/photos?_limit=8）へ Fetch リクエストを送信し、
  }, []);

  // TODO 3: 条件分岐（ローディング中、エラー発生時）のレンダリングを実装してください

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">作品ギャラリー</h1>
      
      {/* TODO 4: 取得した items を map して画像とタイトルを表示してください */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
      </div>
    </div>
  );
};