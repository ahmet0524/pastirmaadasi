// src/pages/api/payment-callback.js

export const prerender = false;

export async function POST({ request, redirect }) {
  try {
    console.log("🔔 Payment callback alındı");

    const contentType = request.headers.get('content-type') || '';
    let token = null;

    // Content-Type'a göre token'ı çıkar
    if (contentType.includes('application/json')) {
      const body = await request.json();
      token = body.token;
      console.log("📦 JSON'dan token:", token);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.text();
      const params = new URLSearchParams(formData);
      token = params.get('token');
      console.log("📦 Form'dan token:", token);
    } else {
      // Fallback: Her iki formatı da dene
      const text = await request.text();
      console.log("📄 Raw body:", text);

      try {
        token = JSON.parse(text).token;
        console.log("📦 JSON parse'dan token:", token);
      } catch {
        const params = new URLSearchParams(text);
        token = params.get('token');
        console.log("📦 URLSearchParams'tan token:", token);
      }
    }

    console.log("🎟️ Extracted token:", token);

    if (token) {
      return redirect(`/odeme-sonuc?token=${token}`, 302);
    } else {
      console.error("❌ Token bulunamadı");
      return redirect('/odeme-sonuc?error=no-token', 302);
    }
  } catch (err) {
    console.error("💥 Callback failed:", err);
    return redirect('/odeme-sonuc?error=callback-failed', 302);
  }
}

export async function GET({ url, redirect }) {
  const token = url.searchParams.get('token');
  console.log("🔍 GET request - token:", token);

  if (token) {
    return redirect(`/odeme-sonuc?token=${token}`, 302);
  }
  return redirect('/odeme-sonuc?error=no-token', 302);
}