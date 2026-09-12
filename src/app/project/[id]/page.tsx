// src/app/project/[id]/page.tsx
export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div style={{ padding: "50px", fontSize: "24px" }}>
      <h1>テスト画面ですわ！</h1>
      <p>取得したID: {id}</p>
    </div>
  );
}