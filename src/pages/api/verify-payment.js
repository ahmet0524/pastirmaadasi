import Iyzipay from "iyzipay";
import { Resend } from "resend";

function isValidEmail(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST({ request }) {
  console.log("🚀 VERIFY-PAYMENT FIXED: Email & Content Separation");

  try {
    const body = await request.json();
    const {
      token,
      customerEmail: frontendEmail,
      customerName,
      customerSurname,
    } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ status: "error", errorMessage: "Token eksik" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // İyzico yapılandırması
    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: "https://sandbox-api.iyzipay.com",
    });

    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        { locale: Iyzipay.LOCALE.TR, conversationId: Date.now().toString(), token },
        (err, data) => (err ? reject(err) : resolve(data))
      );
    });

    if (result.status !== "success" || result.paymentStatus !== "SUCCESS") {
      return new Response(
        JSON.stringify({
          status: "error",
          errorMessage: result.errorMessage || "Ödeme başarısız.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✉️ Email adresini belirle
    let customerEmail =
      result.buyer?.email?.trim() ||
      frontendEmail?.trim() ||
      "";

    const adminEmail = import.meta.env.ADMIN_EMAIL || "successodysseyhub@gmail.com";
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    // fallback: boş ise admin'e gönder, reply_to kapalı
    const isCustomerMailValid = isValidEmail(customerEmail);
    if (!isCustomerMailValid) {
      console.warn("⚠️ Müşteri e-postası geçersiz. Admin fallback uygulanıyor.");
      customerEmail = adminEmail;
    }

    const fullName =
      `${result.buyer?.name || customerName || "Değerli"} ${
        result.buyer?.surname || customerSurname || "Müşterimiz"
      }`.trim();

    const paidPrice = result.paidPrice;
    const paymentId = result.paymentId;

    // =============== MÜŞTERİ MAİLİ (sadece geçerli ise) =================
    if (isCustomerMailValid) {
      const html = `
        <div style="font-family:Arial,sans-serif;color:#333">
          <h2>Merhaba ${fullName},</h2>
          <p>Ödemeniz başarıyla alındı. Siparişiniz hazırlanıyor. 🎉</p>
          <h3>📋 Sipariş Bilgileri</h3>
          <p><strong>Ödeme ID:</strong> ${paymentId}</p>
          <p><strong>Tutar:</strong> ${paidPrice}₺</p>
          <p><strong>Tarih:</strong> ${new Date().toLocaleString("tr-TR")}</p>
          <hr>
          <p>Pastırma Adası ekibi olarak teşekkür ederiz 💫</p>
        </div>
      `;

      await resend.emails.send({
        from: "Pastirma Adasi <siparis@successodysseyhub.com>",
        to: customerEmail,
        subject: `Sipariş Onayı - ${paymentId}`,
        html,
      });

      console.log("✅ Müşteriye e-posta gönderildi:", customerEmail);
    }

    // =============== ADMİN MAİLİ (her zaman gönderilir) =================
    const itemsHTML = Array.isArray(result.basketItems)
      ? result.basketItems
          .map(
            (i) => `<li>${i.name} - ${parseFloat(i.price).toFixed(2)}₺</li>`
          )
          .join("")
      : "<li>Ürün bilgisi mevcut değil</li>";

    const adminHTML = `
      <div style="font-family:Arial,sans-serif;color:#111">
        <h2>💰 Yeni Sipariş Alındı!</h2>
        <p><strong>Müşteri:</strong> ${fullName}</p>
        <p><strong>E-posta:</strong> ${
          isCustomerMailValid ? customerEmail : "Geçersiz / Boş"
        }</p>
        <p><strong>Tutar:</strong> ${paidPrice}₺</p>
        <p><strong>Ödeme ID:</strong> ${paymentId}</p>
        <h3>🛒 Ürünler</h3>
        <ul>${itemsHTML}</ul>
        <hr>
        <p style="font-size:12px;color:#555">
          Bu e-posta Pastırma Adası - Vercel API üzerinden gönderilmiştir.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: "Pastirma Adasi <siparis@successodysseyhub.com>",
      to: adminEmail,
      subject: `Yeni Sipariş - ${fullName} (${paidPrice}₺)`,
      html: adminHTML,
      reply_to: isCustomerMailValid ? customerEmail : undefined,
    });

    console.log("✅ Admin e-postası gönderildi:", adminEmail);

    return new Response(
      JSON.stringify({
        status: "success",
        emailSent: true,
        paymentId,
        paidPrice,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("💥 Genel Hata:", error);
    return new Response(
      JSON.stringify({ status: "error", errorMessage: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
