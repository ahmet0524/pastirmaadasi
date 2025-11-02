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

// Müşteri Email Template - DETAYLI VE ANLAŞILIR
function getCustomerEmailHTML({ customerName, orderNumber, items, total, orderDate, shippingAddress, customerPhone }) {
  // Ürünleri detaylı göster
  const itemsHTML = items.map((item, index) => {
    const itemName = item.name || `Ürün ${index + 1}`;
    const quantity = item.quantity || 1;
    const unit = item.unit || '500gr';
    const price = parseFloat(item.price || 0);
    const totalPrice = (price * quantity).toFixed(2);

    return `
      <div class="item">
        <div>
          <div class="item-name">${index + 1}. ${itemName}</div>
          <div class="item-detail">
            <strong>${quantity} Adet</strong> × ${price.toFixed(2)}₺ (${unit})
          </div>
        </div>
        <div style="font-weight: 700; color: #059669;">${totalPrice}₺</div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #c41e3a 0%, #a01729 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: 800; }
    .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
    .content { background: #f9f9f9; padding: 30px 20px; }
    .greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
    .order-details { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #0891B2; }
    .order-details h3 { color: #0891B2; margin-top: 0; margin-bottom: 15px; font-size: 20px; }
    .info-row { padding: 12px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #666; }
    .info-value { color: #333; text-align: right; }
    .items-section { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .items-section h4 { margin-top: 0; margin-bottom: 20px; color: #333; font-size: 18px; }
    .item { padding: 15px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: flex-start; }
    .item:last-child { border-bottom: none; }
    .item-name { font-weight: 600; color: #333; margin-bottom: 5px; font-size: 15px; }
    .item-detail { color: #666; font-size: 14px; }
    .item-detail strong { color: #0891B2; }
    .total-box { background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); padding: 25px; margin: 20px 0; border-radius: 12px; text-align: center; border: 2px solid #0891B2; }
    .total-label { font-size: 18px; color: #333; margin-bottom: 10px; }
    .total-amount { font-size: 36px; font-weight: 800; color: #c41e3a; }
    .info-box { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .info-box strong { color: #c2410c; display: block; margin-bottom: 8px; font-size: 16px; }
    .footer { text-align: center; padding: 30px 20px; color: #666; font-size: 14px; background: white; border-top: 1px solid #e5e7eb; }
    .footer strong { color: #0891B2; font-size: 16px; }
    .footer .tagline { font-size: 13px; color: #999; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Siparişiniz Alındı!</h1>
      <p>Ödemeniz başarıyla tamamlandı</p>
    </div>

    <div class="content">
      <p class="greeting">Merhaba <strong>${customerName}</strong>,</p>
      <p style="margin-bottom: 30px;">Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz! Siparişiniz hazırlanmaya başlandı.</p>

      <div class="order-details">
        <h3>📋 Sipariş Bilgileri</h3>
        <div class="info-row">
          <span class="info-label">Sipariş No:</span>
          <span class="info-value"><strong>${orderNumber}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Tarih:</span>
          <span class="info-value">${orderDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefon:</span>
          <span class="info-value">${customerPhone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Teslimat Adresi:</span>
          <span class="info-value" style="max-width: 300px;">${shippingAddress}</span>
        </div>
      </div>

      <div class="items-section">
        <h4>🛒 Sipariş İçeriği</h4>
        ${items.length > 0 ? itemsHTML : '<p style="color: #999; text-align: center; padding: 20px;">Ürün detayları yüklenemedi</p>'}
      </div>

      <div class="total-box">
        <div class="total-label">Toplam Tutar</div>
        <div class="total-amount">${total}₺</div>
      </div>

      <div class="info-box">
        <strong>📦 Kargo Takip Bilgisi</strong>
        <p style="margin: 0;">Siparişiniz hazırlandığında kargo takip numaranız e-posta adresinize gönderilecektir. Kargonuz 2-5 iş günü içinde adresinize teslim edilecektir.</p>
      </div>

      <p style="margin-top: 30px; text-align: center; font-size: 18px; color: #059669;">Afiyet olsun! 🙏</p>
    </div>

    <div class="footer">
      <p><strong>Pastırma Adası</strong></p>
      <p class="tagline">Kayseri'nin geleneksel lezzeti</p>
      <p style="margin-top: 15px; font-size: 12px; color: #999;">Bu otomatik bir e-postadır, lütfen yanıtlamayın.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Admin Email Template - DETAYLI VE ANLAŞILIR
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
  // Ürünleri detaylı göster
  const itemsHTML = items.map((item, index) => {
    const itemName = item.name || `Ürün ${index + 1}`;
    const quantity = item.quantity || 1;
    const unit = item.unit || '500gr';
    const price = parseFloat(item.price || 0);
    const totalPrice = (price * quantity).toFixed(2);

    return `
      <div class="item">
        <div class="item-header">
          <strong style="color: #1976D2; font-size: 16px;">${index + 1}. ${itemName}</strong>
        </div>
        <div class="item-details">
          <div class="detail-row">
            <span class="detail-label">📦 Adet:</span>
            <span class="detail-value"><strong>${quantity}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">⚖️ Gramaj:</span>
            <span class="detail-value"><strong>${unit}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💰 Birim Fiyat:</span>
            <span class="detail-value">${price.toFixed(2)}₺</span>
          </div>
          <div class="detail-row total-row">
            <span class="detail-label">🎯 Toplam:</span>
            <span class="detail-value"><strong style="color: #059669; font-size: 18px;">${totalPrice}₺</strong></span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 700px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 800; }
    .urgent { background: #fff3cd; border-left: 5px solid #ff9800; padding: 20px; margin: 20px; border-radius: 8px; }
    .urgent strong { color: #c41e3a; font-size: 16px; }
    .content { padding: 20px; }
    .info-box { background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 4px solid #1976D2; border-radius: 8px; }
    .info-box h3 { margin-top: 0; color: #1976D2; font-size: 18px; margin-bottom: 15px; }
    .info-row { padding: 10px 0; border-bottom: 1px solid #e0e0e0; display: flex; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #555; min-width: 150px; }
    .info-value { color: #333; flex: 1; }
    .items-box { background: #fff; padding: 20px; margin: 15px 0; border: 2px solid #1976D2; border-radius: 8px; }
    .items-box h3 { margin-top: 0; color: #1976D2; font-size: 20px; margin-bottom: 20px; }
    .item { padding: 20px; background: #f8f9fa; margin: 15px 0; border-radius: 8px; border-left: 4px solid #059669; }
    .item-header { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; }
    .item-details { }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .detail-label { color: #666; font-size: 14px; }
    .detail-value { color: #333; font-weight: 600; }
    .total-row { margin-top: 10px; padding-top: 10px; border-top: 2px solid #d0d0d0; }
    .grand-total { background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; margin: 20px 0; border-radius: 12px; text-align: center; border: 3px solid #059669; }
    .grand-total .label { font-size: 20px; color: #333; margin-bottom: 10px; }
    .grand-total .amount { font-size: 42px; font-weight: 800; color: #c41e3a; }
    .action-box { background: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #059669; }
    .action-box strong { color: #1b5e20; display: block; margin-bottom: 10px; font-size: 16px; }
    .action-box ol { margin: 10px 0 0 0; padding-left: 20px; }
    .action-box li { padding: 5px 0; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 YENİ SİPARİŞ ALINDI!</h1>
    </div>

    <div class="urgent">
      <strong>⚠️ ÖDEME TAMAMLANDI - YENİ SİPARİŞ!</strong><br>
      Lütfen hemen kontrol edin ve hazırlığa başlayın.
    </div>

    <div class="content">
      <div class="info-box">
        <h3>📅 Sipariş Detayları</h3>
        <div class="info-row">
          <span class="info-label">Sipariş No:</span>
          <span class="info-value"><strong>${orderNumber}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Ödeme ID:</span>
          <span class="info-value">${orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tarih/Saat:</span>
          <span class="info-value">${orderDate}</span>
        </div>
      </div>

      <div class="info-box">
        <h3>👤 Müşteri Bilgileri</h3>
        <div class="info-row">
          <span class="info-label">Ad Soyad:</span>
          <span class="info-value"><strong>${customerName}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value"><a href="mailto:${customerEmail}">${customerEmail}</a></span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefon:</span>
          <span class="info-value"><strong>${customerPhone || 'Belirtilmemiş'}</strong></span>
        </div>
        ${customerIdentity ? `
        <div class="info-row">
          <span class="info-label">TC Kimlik No:</span>
          <span class="info-value">${customerIdentity}</span>
        </div>
        ` : ''}
      </div>

      <div class="info-box">
        <h3>📦 Teslimat Adresi</h3>
        <p style="margin: 0; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e0e0e0;">${shippingAddress}</p>
      </div>

      <div class="items-box">
        <h3>🛒 Sipariş Edilen Ürünler</h3>
        ${items.length > 0 ? itemsHTML : '<p style="color: #999; text-align: center; padding: 20px;">Ürün detayları yüklenemedi</p>'}
      </div>

      <div class="grand-total">
        <div class="label">💰 TOPLAM SİPARİŞ TUTARI</div>
        <div class="amount">${total}₺</div>
      </div>

      <div class="action-box">
        <strong>✅ Yapılacaklar:</strong>
        <ol>
          <li><strong>Siparişi hazırla</strong> - Ürünleri kontrol et ve paketle</li>
          <li><strong>Kargoya ver</strong> - En kısa sürede kargo şirketine teslim et</li>
          <li><strong>Takip numarasını gönder</strong> - Admin panelinden müşteriye kargo takip numarasını ilet</li>
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
      cartItems: frontendCartItems
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

    let items = [];

    // Önce frontend'den gelen sepeti kontrol et
    if (frontendCartItems && Array.isArray(frontendCartItems) && frontendCartItems.length > 0) {
      console.log("✅ Frontend sepet bilgisi kullanılıyor");
      items = frontendCartItems.map((item, index) => ({
        name: item.name || `Ürün ${index + 1}`,
        price: parseFloat(item.price || 0),
        quantity: item.quantity || 1,
        unit: item.unit || '500g'
      }));
    }
    // Frontend'de veri yoksa İyzico'dan al
    else if (result.basketItems && Array.isArray(result.basketItems)) {
      console.log("✅ Iyzico basket bilgisi kullanılıyor");
      items = result.basketItems.map((item, index) => ({
        name: item.name || item.itemName || `Ürün ${index + 1}`,
        price: parseFloat(item.price || 0),
        quantity: 1,
        unit: '500g'
      }));
    } else {
      console.error("❌ Ne frontend ne de İyzico'dan ürün bilgisi alınamadı!");
    }

    if (items.length === 0) {
      console.error("❌ UYARI: Ürün listesi tamamen boş!");
    } else {
      console.log(`✅ ${items.length} adet ürün işlendi`);
    }

    // 🚀 KRİTİK: Tüm email ve DB işlemlerini PARALEL çalıştır
    // Promise.allSettled kullanarak hiçbiri diğerini bloklamaz
    const orderNumber = `ORD-${Date.now()}`;

    const [dbResult, customerEmailResult, adminEmailResult] = await Promise.allSettled([
      // 1. Veritabanına kaydet
      supabase
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
        .single(),

      // 2. Müşteriye email gönder (sadece geçerli email varsa)
      isCustomerMailValid
        ? resend.emails.send({
            from: "Pastırma Adası <siparis@successodysseyhub.com>",
            to: customerEmail,
            subject: `✅ Siparişiniz Alındı! 🎉 (${paymentId})`,
            html: getCustomerEmailHTML({
              customerName: fullName,
              orderNumber: paymentId,
              items: items,
              total: paidPrice,
              orderDate: orderDate,
              shippingAddress: shippingAddress,
              customerPhone: customerPhone
            })
          })
        : Promise.resolve({ skipped: true }),

      // 3. Admin'e email gönder
      resend.emails.send({
        from: "Pastırma Adası <siparis@successodysseyhub.com>",
        to: adminEmail,
        subject: `🔔 YENİ SİPARİŞ - ${fullName} (${paidPrice}₺)`,
        html: getAdminEmailHTML({
          customerName: fullName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          customerIdentity: customerIdentity,
          orderNumber: paymentId,
          items: items,
          total: paidPrice,
          orderDate: orderDate,
          shippingAddress: shippingAddress
        }),
        replyTo: isCustomerMailValid ? customerEmail : undefined
      })
    ]);

    // Sonuçları logla (opsiyonel)
    if (dbResult.status === 'fulfilled') {
      console.log("✅ Sipariş veritabanına kaydedildi");
    } else {
      console.error("❌ Veritabanı hatası:", dbResult.reason);
    }

    if (customerEmailResult.status === 'fulfilled' && !customerEmailResult.value?.skipped) {
      console.log("✅ Müşteriye email gönderildi:", customerEmail);
    } else if (customerEmailResult.status === 'rejected') {
      console.error("❌ Müşteri emaili gönderilemedi:", customerEmailResult.reason);
    }

    if (adminEmailResult.status === 'fulfilled') {
      console.log("✅ Admin emaili gönderildi:", adminEmail);
    } else {
      console.error("❌ Admin emaili gönderilemedi:", adminEmailResult.reason);
    }

    // Kullanıcıya her durumda başarılı yanıt dön
    // (Email/DB hataları arka planda loglanır, ödeme başarılı)
    return new Response(
      JSON.stringify({
        status: "success",
        emailSent: customerEmailResult.status === 'fulfilled' && !customerEmailResult.value?.skipped,
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