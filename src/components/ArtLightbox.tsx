"use client";

import { useState } from "react";
import Image from "next/image";


export default function ArtLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => {
          console.log("open!");
          setOpen(true);
        }}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
          cursor: "zoom-in",
        }}
      >
        <img src={src} alt={alt} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)} // ここで閉じるはず
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
            padding: 40, // 少し余裕を持たせる
          }}
        >
          {/* 画像を fill にせず、通常のImageとして扱う */}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain" // Tailwindを使わないなら style={{ objectFit: "contain" }}
              unoptimized // サイズ計算をバイパスする
              onClick={() => setOpen(false)} // 画像をクリックしても閉じるようにする
            />
          </div>
        </div>
      )}
    </>
  );
}
