// src/pages/api/verify-payment.js
import crypto from 'crypto';
import { Resend } from "resend";
import Iyzipay from "iyzipay";
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Supabase client
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email validasyonu
function isValidEmail(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Müşteri Email Template - TAM BİLGİLERLE
function getCustomerEmailHTML({ customerName, orderNumber, items, total, orderDate, shippingAddress, customerPhone, paymentId }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #c41e3a; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px 20px; }
    .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .order-details h3 { color: #c41e3a; margin-top: 0; }
    .info-row { padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #666; display: inline-block; width: 120px; }
    .item { padding: 12px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
    .item:last-child { border-bottom: none; }
    .item-name { font-weight: 600; }
    .item-detail { color: #666; font-size: 14px; }
    .total { font-size: 24px; font-weight: bold; color: #c41e3a; margin-top: 20px; padding-top: 20px; border-top: 2px solid #c41e3a; text-align: right; }
    .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 13px; }
    .payment-id { font-size: 11px; color: #999; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Siparişiniz Alındı!</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px;">Merhaba <strong>${customerName}</strong>,</p>
      <p>Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz! Ödemeniz başarıyla tamamlandı ve siparişiniz hazırlanmaya başlandı.</p>

      <div class="order-details">
        <h3>📋 Sipariş Detayları</h3>
        <div class="info-row">
          <span class="info-label">Sipariş No:</span>
          <span>${orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tarih:</span>
          <span>${orderDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefon:</span>
          <span>${customerPhone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Teslimat Adresi:</span>
          <span>${shippingAddress}</span>
        </div>
      </div>

      <div class="order-details">
        <h4 style="margin-top: 0; margin-bottom: 10px;">Satın Aldığınız Ürünler:</h4>
        ${items.length > 0 ? items.map((item, index) => `
          <div class="item">
            <div>
              <div class="item-name">${index + 1}. ${item.name}</div>
              <div class="item-detail">
                ${item.quantity}x ${parseFloat(item.price).toFixed(2)}₺
                ${item.unit ? `(${item.unit})` : ''}
              </div>
            </div>
            <div style="font-weight: 600;">${(parseFloat(item.price) * item.quantity).toFixed(2)}₺</div>
          </div>
        `).join('') : '<p style="color: #999; text-align: center; padding: 20px;">Ürün detayları yüklenemedi</p>'}

        <div class="total">
          Toplam: ${total}₺
        </div>
        ${paymentId ? `<div class="payment-id">Ödeme Ref: ${paymentId}</div>` : ''}
      </div>

      <div class="info-box">
        <strong>📦 Kargo Bilgisi:</strong><br>
        Siparişiniz hazırlandığında kargo takip numaranız email adresinize gönderilecektir.
      </div>

      <p style="margin-top: 30px;">Afiyet olsun! 🙏</p>
    </div>
    <div class="footer">
      <p><strong>Pastırma Adası</strong><br>successodysseyhub.com</p>
      <p style="font-size: 11px; color: #999;">Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Admin Email Template - TAM BİLGİLERLE
function getAdminEmailHTML({
  customerName,
  customerEmail,
  customerPhone,
  customerIdentity,
  orderNumber,
  items,
  total,
  orderDate,
  shippingAddress
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 0 auto; }
    .header { background: #1976D2; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .urgent { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px; border-radius: 4px; }
    .urgent strong { color: #c41e3a; }
    .content { padding: 20px; }
    .info-box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #1976D2; border-radius: 4px; }
    .info-box h3 { margin-top: 0; color: #1976D2; }
    .info-row { padding: 8px 0; border-bottom: 1px solid #ddd; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #555; display: inline-block; min-width: 150px; }
    .item { padding: 12px; background: #fafafa; margin: 8px 0; border-radius: 4px; }
    .total { font-size: 24px; font-weight: bold; color: #1976D2; margin-top: 20px; padding: 20px; background: #e3f2fd; border-radius: 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 YENİ SİPARİŞ ALINDI!</h1>
    </div>

    <div class="urgent">
      <strong>⚠️ ÖDEME TAMAMLANDI - YENİ SİPARİŞ!</strong> Lütfen hemen kontrol edin ve hazırlığa başlayın.
    </div>

    <div class="content">
      <div class="info-box">
        <h3>📅 Sipariş Bilgileri</h3>
        <div class="info-row">
          <span class="info-label">Sipariş No:</span>
          <span>${orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Ödeme ID:</span>
          <span>${orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tarih/Saat:</span>
          <span>${orderDate}</span>
        </div>
      </div>

      <div class="info-box">
        <h3>👤 Müşteri Bilgileri</h3>
        <div class="info-row">
          <span class="info-label">Ad Soyad:</span>
          <span>${customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span><a href="mailto:${customerEmail}">${customerEmail}</a></span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefon:</span>
          <span>${customerPhone || 'Belirtilmemiş'}</span>
        </div>
        ${customerIdentity ? `
        <div class="info-row">
          <span class="info-label">TC Kimlik No:</span>
          <span>${customerIdentity}</span>
        </div>
        ` : ''}
      </div>

      <div class="info-box">
        <h3>📦 Teslimat Adresi</h3>
        <p style="margin: 0; padding: 10px; background: white; border-radius: 4px;">${shippingAddress}</p>
      </div>

      <div class="info-box">
        <h3>🛒 Sipariş İçeriği</h3>
        ${items.length > 0 ? items.map((item, index) => `
          <div class="item">
            <strong>${index + 1}. ${item.name}</strong>
            ${item.unit ? `<span style="color: #666;"> (${item.unit})</span>` : ''}<br>
            <span style="color: #666;">Miktar: ${item.quantity} adet</span><br>
            <strong style="color: #1976D2;">Tutar: ${(parseFloat(item.price) * item.quantity).toFixed(2)}₺</strong>
          </div>
        `).join('') : '<p style="color: #999; text-align: center; padding: 20px;">Ürün detayları yüklenemedi</p>'}
      </div>

      <div class="total">
        💰 TOPLAM TUTAR: ${total}₺
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px;">
        <p style="margin: 0; color: #2e7d32;"><strong>✅ Yapılacaklar:</strong></p>
        <ol style="margin: 10px 0;">
          <li>Siparişi hazırla</li>
          <li>Kargoya ver</li>
          <li>Admin panelinden kargo takip numarasını müşteriye gönder</li>
        </ol>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

export async function POST({ request }) {
  console.log("🚀 VERIFY-PAYMENT: Ödeme doğrulanıyor...");

  try {
    const body = await request.json();
    const {
      token,
      customerEmail: frontendEmail,
      customerName: frontendName,
      customerSurname: frontendSurname,
      customerPhone: frontendPhone,
      customerIdentity: frontendIdentity,
      customerAddress: frontendAddress,
      customerCity: frontendCity,
      customerZipcode: frontendZipcode,
      cartItems: frontendCartItems // 🛒 YENİ: Frontend'den gelen sepet
    } = body;

    console.log("📦 Frontend'den gelen bilgiler:", {
      email: frontendEmail,
      name: frontendName,
      surname: frontendSurname,
      phone: frontendPhone,
      identity: frontendIdentity,
      address: frontendAddress,
      city: frontendCity,
      cartItemsCount: frontendCartItems?.length || 0
    });

    console.log("🛒 Frontend'den gelen sepet RAW:", frontendCartItems);

    if (!token) {
      return new Response(
        JSON.stringify({ status: "error", errorMessage: "Token eksik" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Iyzico API
    const apiKey = import.meta.env.IYZICO_API_KEY;
    const secretKey = import.meta.env.IYZICO_SECRET_KEY;
    const iyzipay = new Iyzipay({
      apiKey: apiKey,
      secretKey: secretKey,
      uri: "https://sandbox-api.iyzipay.com"
    });

    // Ödeme detaylarını al
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

    // ✅ ÖDEME BAŞARISIZ İSE EMAIL GÖNDERME!
    if (result.status !== "success" || result.paymentStatus !== "SUCCESS") {
      console.error("❌ Ödeme başarısız:", result.errorMessage);
      return new Response(
        JSON.stringify({
          status: "error",
          errorMessage: result.errorMessage || "Ödeme başarısız.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Ödeme Iyzico'da doğrulandı - VERİTABANINA KAYDEDİLİYOR");
    console.log("📋 İyzico FULL result:", JSON.stringify(result, null, 2));

    // --- Veri Hazırlığı - FRONTEND VERİSİNİ ÖNCELİKLENDİR ---
    const adminEmail = import.meta.env.ADMIN_EMAIL || "successodysseyhub@gmail.com";

    // Email - Frontend'i önceliklendir
    let customerEmail = frontendEmail?.trim() || result.buyer?.email?.trim() || "";
    const isCustomerMailValid = isValidEmail(customerEmail);
    if (!isCustomerMailValid) {
      console.warn("⚠️ Müşteri e-postası geçersiz:", customerEmail);
      customerEmail = adminEmail;
    }

    // Ad Soyad - Frontend'i önceliklendir
    const name = frontendName?.trim() || result.buyer?.name || "Değerli";
    const surname = frontendSurname?.trim() || result.buyer?.surname || "Müşterimiz";
    const fullName = `${name} ${surname}`.trim();

    // Telefon - Frontend'i önceliklendir
    const customerPhone = frontendPhone
      ? `+90${frontendPhone}`
      : result.buyer?.gsmNumber || '';

    // TC Kimlik - Frontend'i önceliklendir
    const customerIdentity = frontendIdentity || result.buyer?.identityNumber || '';

    // Adres - Frontend'i önceliklendir
    let shippingAddress = '';
    if (frontendAddress && frontendCity) {
      shippingAddress = `${frontendAddress}, ${frontendCity}, Turkey`;
    } else if (result.shippingAddress) {
      shippingAddress = `${result.shippingAddress.address}, ${result.shippingAddress.city}, ${result.shippingAddress.country}`;
    } else {
      shippingAddress = 'Adres bilgisi alınamadı';
    }

    const paidPrice = parseFloat(result.paidPrice);
    const paymentId = result.paymentId;
    const orderDate = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Ürün listesi - ÖNCELİK SIRASI:
    // 1. Frontend'den gelen sepet (en güncel)
    // 2. İyzico'dan gelen basketItems

    console.log("📦 İyzico basketItems RAW:", result.basketItems);
    console.log("📦 İyzico basketItems TYPE:", typeof result.basketItems);
    console.log("📦 İyzico basketItems IS ARRAY:", Array.isArray(result.basketItems));

    let items = [];

    // Önce frontend'den gelen sepeti kontrol et
    if (frontendCartItems && Array.isArray(frontendCartItems) && frontendCartItems.length > 0) {
      console.log("✅ Frontend sepet bilgisi kullanılıyor");
      items = frontendCartItems.map((item, index) => {
        console.log(`  🛒 Frontend Item ${index}:`, item);
        return {
          name: item.name || `Ürün ${index + 1}`,
          price: parseFloat(item.price || 0),
          quantity: item.quantity || 1,
          unit: item.unit || '500g'
        };
      });
    }
    // Frontend'de veri yoksa İyzico'dan al
    else if (result.basketItems && Array.isArray(result.basketItems)) {
      console.log("✅ İyzico basket bilgisi kullanılıyor");
      items = result.basketItems.map((item, index) => {
        console.log(`  📦 Iyzico Item ${index}:`, JSON.stringify(item));
        return {
          name: item.name || item.itemName || `Ürün ${index + 1}`,
          price: parseFloat(item.price || 0),
          quantity: 1,
          unit: '500g'
        };
      });
    } else {
      console.error("❌ Ne frontend ne de İyzico'dan ürün bilgisi alınamadı!");
    }

    console.log("📦 İşlenmiş items (email için):", JSON.stringify(items, null, 2));

    // Eğer items boşsa uyarı ver
    if (items.length === 0) {
      console.error("❌ UYARI: Ürün listesi tamamen boş!");
      console.log("🔍 Tüm result objesi:", JSON.stringify(result, null, 2));
    } else {
      console.log(`✅ ${items.length} adet ürün işlendi`);
    }

    console.log("📧 Email için hazırlanan bilgiler:", {
      fullName,
      customerEmail,
      customerPhone,
      customerIdentity,
      shippingAddress
    });

    // ✅ 1. SUPABASE'E SİPARİŞİ KAYDET
    try {
      const orderNumber = `ORD-${Date.now()}`;

      const { data: orderData, error: dbError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          payment_id: paymentId,
          customer_name: fullName,
          customer_email: customerEmail,
          customer_phone: customerPhone || '',
          customer_address: shippingAddress,
          items: items,
          subtotal: paidPrice,
          shipping_cost: 0,
          shipping: 0,
          discount_amount: 0,
          discount: 0,
          total: paidPrice,
          coupon_code: null,
          status: 'pending',
          payment_status: 'completed',
          notes: customerIdentity ? `TC: ${customerIdentity}` : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error("❌ Supabase kayıt hatası:", dbError);
      } else {
        console.log("✅ Sipariş veritabanına kaydedildi:", orderData);
      }
    } catch (dbError) {
      console.error("❌ Veritabanı hatası:", dbError);
    }

    // ✅ 2. MÜŞTERİYE EMAİL GÖNDER
    if (isCustomerMailValid) {
      try {
        await resend.emails.send({
          from: "Pastırma Adası <siparis@successodysseyhub.com>",
          to: customerEmail,
          subject: `✅ Siparişiniz Alındı! 🎉 (#${orderNumber})`,
          html: getCustomerEmailHTML({
            customerName: fullName,
            orderNumber: orderNumber, // ✅ Kendi sipariş numaramız
            items: items,
            total: paidPrice,
            orderDate: orderDate,
            shippingAddress: shippingAddress,
            customerPhone: customerPhone,
            paymentId: paymentId // ✅ İyzico ID'si ekstra bilgi olarak
          })
        });
        console.log("✅ Müşteriye email gönderildi:", customerEmail);
      } catch (emailError) {
        console.error("❌ Müşteri emaili gönderilemedi:", emailError);
      }
    }

    // ✅ 3. ADMİN'E EMAİL GÖNDER
    try {
      await resend.emails.send({
        from: "Pastırma Adası <siparis@successodysseyhub.com>",
        to: adminEmail,
        subject: `🔔 YENİ SİPARİŞ - ${fullName} (${paidPrice}₺) - #${orderNumber}`,
        html: getAdminEmailHTML({
          customerName: fullName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          customerIdentity: customerIdentity,
          orderNumber: orderNumber, // ✅ Kendi sipariş numaramız
          paymentId: paymentId, // ✅ İyzico ID'si ayrı gösterilecek
          items: items,
          total: paidPrice,
          orderDate: orderDate,
          shippingAddress: shippingAddress
        }),
        replyTo: isCustomerMailValid ? customerEmail : undefined
      });
      console.log("✅ Admin emaili gönderildi:", adminEmail);
    } catch (adminEmailError) {
      console.error("❌ Admin emaili gönderilemedi:", adminEmailError);
    }

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