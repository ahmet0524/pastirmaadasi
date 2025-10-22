// src/pages/api/verify-payment.js
import crypto from 'crypto';
import { Resend } from "resend";

export const prerender = false;

// İyzico imza oluşturma fonksiyonu - DOĞRU FORMAT
function generateIyzicoSignature(secretKey, randomString, requestBody) {
  const dataToHash = randomString + requestBody;
  const hash = crypto.createHmac('sha1', secretKey).update(dataToHash, 'utf8').digest('base64');
  return hash;
}

function isValidEmail(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST({ request }) {
  console.log("🚀 VERIFY-PAYMENT: Email & Content Separation");

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

    // İyzico API keys
    const apiKey = import.meta.env.IYZICO_API_KEY;
    const secretKey = import.meta.env.IYZICO_SECRET_KEY;

    const requestBody = {
      locale: 'tr',
      conversationId: Date.now().toString(),
      token
    };

    const requestBodyString = JSON.stringify(requestBody);
    const randomString = crypto.randomBytes(16).toString('hex');
    const authorization = generateIyzicoSignature(apiKey, secretKey, randomString, requestBodyString);

    // İyzico'dan ödeme bilgilerini al
    const response = await fetch('https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/auth/ecom/detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `IYZWS ${apiKey}:${authorization}`,
        'x-iyzi-rnd': randomString,
      },
      body: requestBodyString,
    });

    const result = await response.json();

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