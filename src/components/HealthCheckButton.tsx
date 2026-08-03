'use client';

import { useState } from 'react';

type HealthResponse = {
  status: string;
  message: string;
  timestamp: string;
};

export default function HealthCheckButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleHealthCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${apiUrl}/api/v1/health`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('API Connection Error:', err);
      setError(err.message || 'Rails API への接続に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px' }}>
      <h3>Rails API 疎通テスト</h3>
      <button
        onClick={handleHealthCheck}
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '接続確認中...' : 'Railsに通信テスト送信'}
      </button>

      {/* 成功時の表示 */}
      {result && (
        <div style={{ marginTop: '15px', color: 'green', backgroundColor: '#e6ffe6', padding: '10px', borderRadius: '4px' }}>
          <p><strong>ステータス:</strong> {result.status}</p>
          <p><strong>応答:</strong> {result.message}</p>
          <p><small>時刻: {new Date(result.timestamp).toLocaleString()}</small></p>
        </div>
      )}

      {/* エラー時の表示 */}
      {error && (
        <div style={{ marginTop: '15px', color: 'red', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '4px' }}>
          <p><strong>接続エラー:</strong> {error}</p>
          <p><small>※CORS設定やRails側の起動状態を確認してください</small></p>
        </div>
      )}
    </div>
  );
}