// src/pages/api/verify-payment.js
import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Basit ama sağlam bir kontrol
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST({ request }) {
  console.log('🚀 VERIFY-PAYMENT V6.1 - MAIL 422 FIX');

  try {
    const body = await request.json();
    console.log('📥 Gelen Body:', JSON.stringify(body, null, 2));

    const {
      token,
      customerEmail: frontendEmail,
      customerName,
      customerSurname,
    } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ status: 'error', errorMessage: 'Token eksik' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        { locale: Iyzipay.LOCALE.TR, conversationId: Date.now().toString(), token },
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });

    console.log('📊 İyzico Response:', {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      iyzicoEmail: result.buyer?.email,
      iyzicoName: result.buyer?.name,
      iyzicoSurname: result.buyer?.surname,
    });

    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: result.errorMessage || 'Ödeme başarısız',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MAIL GÖNDERİMİ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let emailSent = false;
    let emailError = null;

    try {
      const resendApiKey = import.meta.env.RESEND_API_KEY;
      if (!resendApiKey) throw new Error('RESEND_API_KEY tanımlı değil');

      const resend = new Resend(resendApiKey);

      // 1) Kullanılacak e-posta
      let customerEmail =
        (result.buyer?.email && result.buyer.email.trim()) ||
        (frontendEmail && frontendEmail.trim()) ||
        '';

      if (!isValidEmail(customerEmail)) {
        // Son çare: admin’e gönder, reply_to boş bırakma
        console.warn('⚠️ Müşteri email geçersiz/boş. Admin fallback kullanılacak.');
        customerEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
      }

      // 2) İsimler
      const buyerName = (result.buyer?.name || customerName || 'Değerli').toString();
      const buyerSurname = (result.buyer?.surname || customerSurname || 'Müşterimiz').toString();
      const fullName = `${buyerName} ${buyerSurname}`.trim();

      // 3) From / To
      const fromEmail =
        import.meta.env.RESEND_FROM || 'Pastirma Adasi <siparis@successodysseyhub.com>';
      const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';

      // 4) İçerikler
      const paidPrice = result.paidPrice;
      const paymentId = result.paymentId;

      // Müşteri maili
      const customerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #dc2626; margin: 0;">🎉 Siparişiniz Alındı!</h1>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; font-size: 16px;">Merhaba <strong>${fullName}</strong>,</p>
            <p style="color: #374151;">Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz.</p>
            <p style="color: #6b7280;">Ödemeniz başarıyla alındı ve siparişiniz hazırlanmaya başladı.</p>
          </div>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #1f2937; margin-top: 0;">📋 Sipariş Detayları</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Ödeme ID:</strong></td><td style="padding: 8px 0; color: #1f2937; text-align: right;">${paymentId}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Toplam Tutar:</strong></td><td style="padding: 8px 0; color: #dc2626; text-align: right; font-size: 18px; font-weight: bold;">${paidPrice} ₺</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Tarih:</strong></td><td style="padding: 8px 0; color: #1f2937; text-align: right;">${new Date().toLocaleString('tr-TR')}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;"><strong>Durum:</strong></td><td style="padding: 8px 0; text-align: right;"><span style="background: #d1fae5; color: #10b981; padding: 4px 12px; border-radius: 12px; font-weight: 600;">✅ Başarılı</span></td></tr>
            </table>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <div style="text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">Pastırma Adası</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">İletişim: successodysseyhub@gmail.com</p>
          </div>
        </div>
      `;

      // Admin maili (ürün listesi yoksa güvenli boş)
      const orderItemsHTML = Array.isArray(result.basketItems)
        ? result.basketItems
            .map(
              (item, index) => `
          <tr style="border-bottom: 1px solid #4b5563;">
            <td style="padding: 10px; color: #d1d5db;">${index + 1}</td>
            <td style="padding: 10px; color: #f9fafb;"><strong>${item.name}</strong></td>
            <td style="padding: 10px; color: #10b981; text-align: right;">${Number.parseFloat(item.price).toFixed(2)} ₺</td>
          </tr>`
            )
            .join('')
        : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;">Ürün detayı sağlanmadı.</td></tr>`;

      const adminHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0f172a; color: #f1f5f9; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💰 YENİ SİPARİŞ ALINDI!</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 14px;">Sipariş #${paymentId}</p>
          </div>
          <div style="background: #1e293b; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #10b981;">
            <h2 style="color: #fbbf24; margin-top: 0; font-size: 20px;">👤 MÜŞTERİ BİLGİLERİ</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #94a3b8; width: 140px;"><strong>Ad Soyad:</strong></td><td style="padding: 8px 0; color: #f1f5f9; font-size: 16px;"><strong>${fullName}</strong></td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>E-posta:</strong></td><td style="padding: 8px 0; color: #60a5fa;"><a href="mailto:${customerEmail}" style="color: #60a5fa; text-decoration: none;">${customerEmail}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Telefon:</strong></td><td style="padding: 8px 0; color: #f1f5f9;">${result.buyer?.gsmNumber || '❌ Belirtilmemiş'}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Şehir:</strong></td><td style="padding: 8px 0; color: #f1f5f9;">${result.shippingAddress?.city || result.buyer?.city || '-'}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8; vertical-align: top;"><strong>Adres:</strong></td><td style="padding: 8px 0; color: #f1f5f9;">${result.shippingAddress?.address || '❌ Adres bilgisi eksik'}</td></tr>
            </table>
          </div>
          <div style="background: #1e293b; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
            <h2 style="color: #60a5fa; margin-top: 0; font-size: 20px;">💳 ÖDEME BİLGİLERİ</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #94a3b8; width: 140px;"><strong>Ödeme ID:</strong></td><td style="padding: 8px 0; color: #10b981; font-family: monospace;">${paymentId}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Toplam Tutar:</strong></td><td style="padding: 8px 0; color: #10b981; font-size: 24px; font-weight: bold;">${paidPrice} ₺</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Ödeme Türü:</strong></td><td style="padding: 8px 0; color: #f1f5f9;">Kredi Kartı (İyzico)</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Tarih:</strong></td><td style="padding: 8px 0; color: #f1f5f9;">${new Date().toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'short' })}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Durum:</strong></td><td style="padding: 8px 0;"><span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 6px; font-weight: bold;">✅ ÖDEME BAŞARILI</span></td></tr>
            </table>
          </div>
          <div style="background: #1e293b; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h2 style="color: #f59e0b; margin-top: 0; font-size: 20px;">🛒 SİPARİŞ İÇERİĞİ</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="background: #0f172a; border-bottom: 2px solid #4b5563;">
                  <th style="padding: 12px; text-align: left; color: #94a3b8; width: 50px;">#</th>
                  <th style="padding: 12px; text-align: left; color: #94a3b8;">Ürün Adı</th>
                  <th style="padding: 12px; text-align: right; color: #94a3b8;">Fiyat</th>
                </tr>
              </thead>
              <tbody>${orderItemsHTML}</tbody>
              <tfoot>
                <tr style="background: #0f172a;">
                  <td colspan="2" style="padding: 15px; text-align: right; color: #94a3b8; font-weight: bold; font-size: 16px;">TOPLAM:</td>
                  <td style="padding: 15px; text-align: right; color: #10b981; font-weight: bold; font-size: 20px;">${paidPrice} ₺</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      // Gönderimler
      const customerSend = await resend.emails.send({
        from: fromEmail,
        to: customerEmail, // string yeterli
        subject: `✅ Siparişiniz Alındı - #${paymentId}`,
        html: customerHTML,
        // reply_to bilinçli boş bırakılabilir ya da admin eklenebilir:
        reply_to: 'successodysseyhub@gmail.com',
      });

      const adminSend = await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `💰 Yeni Sipariş - ${fullName} - ${paidPrice}₺`,
        html: adminHTML,
        reply_to: customerEmail, // admin cevap verirse müşteriye döner
      });

      console.log('✅ Müşteri mail id:', customerSend?.id);
      console.log('✅ Admin mail id:', adminSend?.id);
      emailSent = true;
    } catch (err) {
      console.error('❌ Mail gönderim hatası:', err);
      emailSent = false;
      emailError = err?.message || 'Bilinmeyen mail hatası';
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        paymentId: result.paymentId,
        paidPrice: result.paidPrice,
        paymentStatus: result.paymentStatus,
        emailSent,
        emailError,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('💥 Genel Hata:', error);
    return new Response(
      JSON.stringify({ status: 'error', errorMessage: error.message || 'Sunucu hatası' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
