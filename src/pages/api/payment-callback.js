export async function POST({ request }) {
  try {
    // İyzico callback'i form-data olarak gönderir
    const formData = await request.formData();
    const token = formData.get("token");
    const status = formData.get("status");
    const conversationId = formData.get("conversationId");

    console.log("🔔 İyzico callback alındı:", { 
      status, 
      token, 
      conversationId 
    });

    // Kullanıcıyı sonuç sayfasına yönlendir
    // Mail gönderimi verify-payment.js'de yapılacak
    const redirectUrl = token
      ? `/odeme-sonuc?token=${token}`
      : "/odeme-sonuc?error=no-token";

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  } catch (error) {
    console.error("❌ payment-callback hatası:", error);
    
    // Hata durumunda yine sonuç sayfasına yönlendir
    return new Response(null, {
      status: 302,
      headers: { Location: "/odeme-sonuc?error=callback-failed" },
    });
  }
}

// Test endpoint
export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: "ok", 
      message: "Payment Callback endpoint aktif",
      info: "Bu endpoint sadece İyzico callback'i için kullanılır"
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}