// src/pages/api/verify-payment.js
import crypto from 'crypto';
import { Resend } from "resend";
import Iyzipay from "iyzipay"; // Iyzipay'i import ettiğinizden emin olun

export const prerender = false;

// İmza oluşturma fonksiyonu - BU IYZICO'NUN KULLANDIĞI DOĞRU FORMATTIR
// (Bu dosyadaki `retrieve` işlemi için gerekli)
function generateIyzicoSignature(apiKey, secretKey, randomString, pkiString) {
  // 1. PkiString: [randomKey] + [requestBody]
  const dataToHash = `${randomString}${pkiString}`;

  // 2. HMAC-SHA1 ile hash oluştur
  const hash = crypto.createHmac('sha1', secretKey)
    .update(dataToHash, 'utf8')
    .digest('base64');

  // 3. Authorization string
  const authString = `${apiKey}:${randomString}:${hash}`;

  // 4. Base64 encode
  return Buffer.from(authString, 'utf8').toString('base64');
}

// E-posta formatı kontrolü
function isValidEmail(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST({ request }) {
  console.log("🚀 VERIFY-PAYMENT: E-posta içerikleri güncellendi.");

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

    // Iyzico API keys
    const apiKey = import.meta.env.IYZICO_API_KEY;
    const secretKey = import.meta.env.IYZICO_SECRET_KEY;
    const iyzipay = new Iyzipay({
      apiKey: apiKey,
      secretKey: secretKey,
      uri: "https://sandbox-api.iyzipay.com"
    });

    // Ödeme detaylarını Iyzico'dan al
    // NOT: create-payment.js'deki gibi kütüphane metodunu kullanmak daha sağlıklıdır.
    // Eğer kütüphane (iyzipay.checkoutForm.retrieve) sorun çıkarırsa bu manuel yöntemi kullanın.
    // Şimdilik kütüphane yöntemini kullanıyoruz:

    const retrieveRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      token: token,
    };

    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(retrieveRequest, (err, data) => {
        if (err) return reject(err);
        return resolve(data);
      });
    });

    if (result.status !== "success" || result.paymentStatus !== "SUCCESS") {
      console.error("❌ Ödeme Iyzico'da doğrulanırken hata oluştu:", result.errorMessage);
      return new Response(
        JSON.stringify({
          status: "error",
          errorMessage: result.errorMessage || "Ödeme başarısız.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Ödeme Iyzico'da doğrulandı.");

    // --- E-posta Gönderim Mantığı ---

    let customerEmail = result.buyer?.email?.trim() || frontendEmail?.trim() || "";
    const adminEmail = import.meta.env.ADMIN_EMAIL || "info@pastirmaadasi.com"; // YÖNETİCİ E-POSTASI
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const isCustomerMailValid = isValidEmail(customerEmail);

    if (!isCustomerMailValid) {
      console.warn("⚠️ Müşteri e-postası geçersiz. Admin fallback uygulanıyor.");
      customerEmail = adminEmail; // Müşteri maili geçersizse, müşteri mailini de admine gönder
    }

    // Gerekli bilgileri topla
    const fullName = `${result.buyer?.name || customerName || "Değerli"} ${
      result.buyer?.surname || customerSurname || "Müşterimiz"
    }`.trim();
    const paidPrice = result.paidPrice;
    const paymentId = result.paymentId;
    const shippingAddress = result.shippingAddress;

    // 1. Ürün Listesi HTML'ini oluştur
    const itemsHTML = Array.isArray(result.basketItems)
      ? result.basketItems
          .map(
            (i) =>
              `<li>${i.name} - <strong>${parseFloat(i.price).toFixed(2)}₺</strong></li>`
          )
          .join("")
      : "<li>Ürün bilgisi mevcut değil</li>";

    // 2. Adres Bilgisi HTML'ini oluştur
    const addressHTML = shippingAddress
      ? `<p><strong>Adres:</strong> ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.country}</p>`
      : '<p><strong>Adres:</strong> Adres bilgisi alınamadı.</p>';

    // =============== MÜŞTERİ MAİLİ (sadece geçerli ise) =================
    if (isCustomerMailValid) {
      const customerHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 24px;">
          <h2 style="color: #b91c1c;">Merhaba ${fullName},</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Siparişiniz başarıyla alındı. 🎉 Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz.
            Siparişiniz en kısa sürede hazırlanıp kargoya verilecektir.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <h3>📋 Sipariş Bilgileri</h3>
          <p><strong>Ödeme ID:</strong> ${paymentId}</p>
          <p><strong>Toplam Tutar:</strong> <strong>${paidPrice}₺</strong></p>
          <p><strong>Tarih:</strong> ${new Date().toLocaleString("tr-TR")}</p>

          <h3 style="margin-top: 20px;">🛒 Satın Alınan Ürünler</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            ${itemsHTML}
          </ul>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 14px; color: #555;">
            Afiyet olsun!<br>
            Pastırma Adası Ekibi 💫
          </p>
        </div>
      `;

      try {
        await resend.emails.send({
          from: "Pastirma Adasi <siparis@successodysseyhub.com>",
          to: customerEmail,
          subject: `Siparişiniz Alındı! 🚀 (ID: ${paymentId})`,
          html: customerHtml,
        });
        console.log("✅ Müşteriye e-posta gönderildi:", customerEmail);
      } catch (emailError) {
        console.error("❌ Müşteri e-postası gönderilemedi:", emailError);
        // Admin maili yine de gitmeli, bu yüzden burada durmuyoruz.
      }
    }

    // =============== ADMİN MAİLİ (her zaman gönderilir) =================
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 24px;">
        <h2 style="color: #16a34a;">💰 Yeni Sipariş Alındı!</h2>
        <p><strong>Müşteri:</strong> ${fullName}</p>
        <p><strong>E-posta:</strong> ${
          isCustomerMailValid ? customerEmail : `Geçersiz / Boş (${customerEmail})`
        }</p>

        ${addressHTML}

        <p><strong>Toplam Tutar:</strong> <strong style="font-size: 1.2em; color: #16a34a;">${paidPrice}₺</strong></p>
        <p><strong>Ödeme ID:</strong> ${paymentId}</p>

        <h3 style="margin-top: 20px;">🛒 Satın Alınan Ürünler</h3>
        <ul style="list-style-type: none; padding-left: 0;">
          ${itemsHTML}
        </ul>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #555;">
          Bu e-posta Pastırma Adası - Vercel API üzerinden gönderilmiştir.
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: "Pastirma Adasi <siparis@successodysseyhub.com>",
        to: adminEmail,
        subject: `Yeni Sipariş Alındı - ${fullName} (${paidPrice}₺)`,
        html: adminHtml,
        reply_to: isCustomerMailValid ? customerEmail : undefined,
      });
      console.log("✅ Admin e-postası gönderildi:", adminEmail);
    } catch (adminEmailError) {
      console.error("❌ Admin e-postası gönderilemedi:", adminEmailError);
      // Bu kritik bir hata, adminin haberi olmalı
      // Burada bir 500 hatası döndürebilirsiniz ancak ödeme başarılı olduğu için 200 dönmek daha iyi.
    }

    // Her durumda ödeme başarılı olduğu için 200 döndür
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
    console.error("💥 VERIFY-PAYMENT Genel Hata:", error);
    return new Response(
      JSON.stringify({ status: "error", errorMessage: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}