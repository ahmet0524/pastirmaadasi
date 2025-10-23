// src/pages/api/payment-callback.js

export const POST = async ({ request, redirect }) => {
  try {
    console.log("🔔 Payment callback alındı");

    // İyzipay'i yükle
    const Iyzipay = (await import("iyzipay")).default;

    const iyzipay = new Iyzipay({
      apiKey: "sandbox-iMWOs8liBFXBEw49vXevtfru7ZnPkIDs",
      secretKey: "sandbox-cUbewaUJPvAzNUUMsXaGzbUzK2gsYudG",
      uri: "https://sandbox-api.iyzipay.com",
    });

    // Form data'yı al (İyzico form-urlencoded gönderir)
    const formData = await request.formData();
    const token = formData.get('token');

    console.log("🎟️ Token:", token);

    if (!token) {
      console.error("❌ Token bulunamadı");
      return redirect('/sepet?error=token-missing');
    }

    // Ödeme sonucunu kontrol et
    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: Date.now().toString(),
        token: token
      }, (err, result) => {
        if (err) {
          console.error("❌ İyzico retrieve hatası:", err);
          reject(err);
        } else {
          console.log("📥 İyzico retrieve sonucu:", JSON.stringify(result, null, 2));
          resolve(result);
        }
      });
    });

    if (result.status === "success" && result.paymentStatus === "SUCCESS") {
      console.log("✅ Ödeme başarılı!");

      // TODO: Burada sipariş kaydı yapılabilir
      // - Veritabanına kaydet
      // - E-posta gönder
      // - Stok güncelle vb.

      // Başarılı sayfasına yönlendir
      return redirect('/odeme-basarili?orderId=' + result.basketId);
    } else {
      console.error("❌ Ödeme başarısız:", result.errorMessage);
      return redirect('/sepet?error=payment-failed&message=' + encodeURIComponent(result.errorMessage || 'Ödeme başarısız'));
    }
  } catch (error) {
    console.error("💥 Callback hatası:", error);
    return redirect('/sepet?error=callback-error&message=' + encodeURIComponent(error.message));
  }
};

// GET endpoint (kullanıcı direkt bu URL'yi ziyaret ederse)
export const GET = ({ redirect }) => {
  return redirect('/sepet');
};

// OPTIONS for CORS
export const OPTIONS = () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
    },
  });
};