'use server';

import { cookies } from 'next/headers';

export async function loginAction(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  // Next.jsコンテナ -> Railsコンテナへの内部通信
  const apiUrl = process.env.RAILS_API_URL_INTERNAL || 'http://backend:3000';

  try {
    const res = await fetch(`${apiUrl}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email, password } }),
    });

    if (!res.ok) {
      return { error: 'メールアドレスまたはパスワードが違います' };
    }

    // Devise-JWT から返された Authorization ヘッダー（Bearer xxx）を取得
    const authHeader = res.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (token) {
      const cookieStore = await cookies();
      cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Login Fetch Error:', err);
    return { error: 'サーバーとの通信に失敗しました' };
  }
}