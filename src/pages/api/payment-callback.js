// src/pages/api/payment-callback.js
export const prerender = false; // SSR aktif kalsın

export async function POST({ request, redirect }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let token = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      token = body.token;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.text();
      const params = new URLSearchParams(formData);
      token = params.get('token');
    } else {
      const text = await request.text();
      try {
        token = JSON.parse(text).token;
      } catch {
        const params = new URLSearchParams(text);
        token = params.get('token');
      }
    }

    console.log('Extracted token:', token);

    if (token) {
      return redirect(`/odeme-sonuc?token=${token}`, 302);
    } else {
      return redirect('/odeme-sonuc?error=no-token', 302);
    }
  } catch (err) {
    console.error('Callback failed:', err);
    return redirect('/odeme-sonuc?error=callback-failed', 302);
  }
}

export async function GET({ url, redirect }) {
  const token = url.searchParams.get('token');
  if (token) {
    return redirect(`/odeme-sonuc?token=${token}`, 302);
  }
  return redirect('/odeme-sonuc?error=no-token', 302);
}
