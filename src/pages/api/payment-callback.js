import { Resend } from "resend";

// Resend başlat
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function POST({ request }) {
  try {
    // İyzico callback'i form-data olarak gönderir
    const formData = await request.formData();
    const token = formData.get("token");
    const status = formData.get("status");
    const price = formData.get("price");
    const conversationId = formData.get("conversationId");
    const email = formData.get("buyerEmail") || "ayavuz0524@gmail.com";

    console.log("🔔 İyzico callback alındı:", { status, token, price, email });

    // 1️⃣ Ödeme başarılıysa e-posta gönder
    if (status === "success") {
      const htmlContent = `
        <h2>Ödemeniz Başarıyla Alındı 🎉</h2>
        <p>Merhaba, Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz!</p>
        <p><strong>Tutar:</strong> ${price || "-"} ₺</p>
        <p><strong>İşlem Kodu:</strong> ${token || "-"} </p>
        <p><strong>Conversation ID:</strong> ${conversationId || "-"} </p>
        <p>Pastırma Adası ekibi olarak afiyet dileriz 🥩</p>
      `;

      // 🔹 2️⃣ Kullanıcıya gönder
      await resend.emails.send({
        from: "Pastırma Adası <noreply@pastirmaadasi.com>",
        to: email,
        subject: "Ödemeniz Başarıyla Alındı 🎉",
        html: htmlContent,
      });

      // 🔹 3️⃣ Sana (admin'e) gönder
      await resend.emails.send({
        from: "Pastırma Adası <noreply@pastirmaadasi.com>",
        to: "ayavuz0524@gmail.com",
        subject: "Yeni Ödeme Bildirimi 💰",
        html: `
          <h2>Yeni bir ödeme alındı!</h2>
          <p><strong>Müşteri:</strong> ${email}</p>
          <p><strong>Tutar:</strong> ${price || "-"} ₺</p>
          <p><strong>Token:</strong> ${token || "-"} </p>
          <p><strong>Durum:</strong> ${status}</p>
          <hr />
          <p>Pastırma Adası - Otomatik bildirim sistemi</p>
        `,
      });

      console.log("✅ E-postalar başarıyla gönderildi:", email);
    } else {
      console.log("⚠️ Ödeme başarısız, e-posta gönderilmedi:", status);
    }

    // 4️⃣ Kullanıcıyı sonuç sayfasına yönlendir
    const redirectUrl = token
      ? `/odeme-sonuc?token=${token}`
      : "/odeme-sonuc?error=no-token";

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  } catch (error) {
    console.error("❌ payment-callback hatası:", error);
    return new Response("Sunucu hatası", { status: 500 });
  }
}

// Basit test endpoint (GET)
export async function GET() {
  return new Response(
    JSON.stringify({ status: "ok", message: "Payment Callback aktif" }),
    { headers: { "Content-Type": "application/json" } }
  );
}
