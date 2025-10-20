// src/pages/api/payment-callback.js

export const prerender = false; // SSR zorunlu

export async function POST({ request }) {
  try {
    console.log('🔔 Payment callback alındı - POST request');

    // İyzico callback'i form-data olarak gönderir
    const formData = await request.formData();
    const token = formData.get("token");
    const status = formData.get("status");
    const conversationId = formData.get("conversationId");

    console.log("🔔 İyzico callback data:", {
      status,
      token,
      conversationId
    });

    // Kullanıcıyı sonuç sayfasına yönlendir
    const redirectUrl = token
      ? `/odeme-sonuc?token=${token}`
      : "/odeme-sonuc?error=no-token";

    console.log('➡️ Yönlendirme:', redirectUrl);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'no-cache'
      },
    });
  } catch (error) {
    console.error("❌ payment-callback hatası:", error);

    // Hata durumunda yine sonuç sayfasına yönlendir
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/odeme-sonuc?error=callback-failed",
        'Cache-Control': 'no-cache'
      },
    });
  }
}

// GET request'i de destekle (test için)
export async function GET({ url }) {
  try {
    console.log('🔔 Payment callback alındı - GET request');

    // Query parameters'den token al
    const token = url.searchParams.get("token");
    const status = url.searchParams.get("status");
    const conversationId = url.searchParams.get("conversationId");

    console.log("🔔 İyzico callback data (GET):", {
      status,
      token,
      conversationId
    });

    // Eğer token varsa yönlendir
    if (token || status) {
      const redirectUrl = token
        ? `/odeme-sonuc?token=${token}`
        : "/odeme-sonuc?error=no-token";

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl,
          'Cache-Control': 'no-cache'
        },
      });
    }

    // Test endpoint yanıtı
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Payment Callback endpoint aktif",
        info: "Bu endpoint İyzico callback'i için kullanılır",
        methods: ["GET", "POST"],
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error("❌ payment-callback GET hatası:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// OPTIONS için CORS desteği (gerekirse)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}