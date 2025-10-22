import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

export async function POST({ request }) {
  console.log('🚀 VERIFY-PAYMENT V6.0 - FINAL FIX');

  try {
    // ✅ ÖNCE body'yi al
    const body = await request.json();

    // ✅ SONRA log'la
    console.log('🚨 ACİL DEBUG - Gelen Body:', JSON.stringify(body, null, 2));

    const { token, customerEmail: frontendEmail, customerName, customerSurname } = body;

    console.log('📥 Gelen veriler:', {
      token,
      frontendEmail,
      customerName,
      customerSurname
    });

    if (!token) {
      return new Response(
        JSON.stringify({ status: 'error', errorMessage: 'Token eksik' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // İyzico yapılandırması
    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

    // Ödeme durumunu kontrol et
    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: Date.now().toString(),
          token,
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });

    console.log('📊 İyzico Response:', {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      iyzicoEmail: result.buyer?.email,
      iyzicoName: result.buyer?.name,
      iyzicoSurname: result.buyer?.surname
    });

    // Ödeme başarısız kontrolü
    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      console.log('❌ Ödeme başarısız');
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: result.errorMessage || 'Ödeme başarısız',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ✅ ÖDEME BAŞARILI - MAİL GÖNDERİMİ
    console.log('✅ Ödeme başarılı, mail gönderimi başlatılıyor...');

    let emailSent = false;
    let emailError = null;

    try {
      // 🔥 EMAIL ADRESI BELİRLEME
      let customerEmail = null;

      if (result.buyer?.email && result.buyer.email.trim() !== '') {
        customerEmail = result.buyer.email.trim();
        console.log('📧 Email İyzico\'dan alındı:', customerEmail);
      } else if (frontendEmail && frontendEmail.trim() !== '') {
        customerEmail = frontendEmail.trim();
        console.log('📧 Email frontend\'den alındı:', customerEmail);
      }

      if (!customerEmail) {
        throw new Error('❌ KRITIK: Müşteri email adresi bulunamadı!');
      }

      console.log('✅ Kullanılacak email:', customerEmail);

      // Resend API key kontrolü
      if (!import.meta.env.RESEND_API_KEY) {
        throw new Error('❌ RESEND_API_KEY tanımlı değil');
      }

      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      // Müşteri ismi
      const buyerName = result.buyer?.name || customerName || 'Değerli';
      const buyerSurname = result.buyer?.surname || customerSurname || 'Müşterimiz';
      const fullName = `${buyerName} ${buyerSurname}`.trim();

      console.log('👤 Müşteri bilgileri:', { buyerName, buyerSurname, fullName, email: customerEmail });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 1️⃣ MÜŞTERİYE MAİL GÖNDER
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Ödeme ID:</strong></td>
                <td style="padding: 8px 0; color: #1f2937; text-align: right;">${result.paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Toplam Tutar:</strong></td>
                <td style="padding: 8px 0; color: #dc2626; text-align: right; font-size: 18px; font-weight: bold;">${result.paidPrice} ₺</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Tarih:</strong></td>
                <td style="padding: 8px 0; color: #1f2937; text-align: right;">${new Date().toLocaleString('tr-TR')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Durum:</strong></td>
                <td style="padding: 8px 0; text-align: right;"><span style="background: #d1fae5; color: #10b981; padding: 4px 12px; border-radius: 12px; font-weight: 600;">✅ Başarılı</span></td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              🚚 Siparişiniz en kısa sürede kargoya verilecektir.<br>
              📞 Herhangi bir sorunuz olması durumunda bize ulaşabilirsiniz.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <div style="text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">Pastırma Adası</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">İletişim: successodysseyhub@gmail.com</p>
          </div>
        </div>
      `;

      console.log('📤 MÜŞTERİYE mail gönderiliyor:', customerEmail);

      const customerMailResult = await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: customerEmail,
        subject: `✅ Siparişiniz Alındı - #${result.paymentId}`,
        html: customerHTML,
        reply_to: 'successodysseyhub@gmail.com',
      });

      console.log('✅ Müşteri maili gönderildi:', customerMailResult.id);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 2️⃣ ADMİN'E MAİL GÖNDER
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const adminHTML = `
        <div style="font-family: monospace; max-width: 700px; margin: 0 auto; padding: 20px; background: #1f2937; color: #f9fafb; border-radius: 10px;">
          <h2 style="color: #10b981; margin-top: 0;">💰 YENİ SİPARİŞ ALINDI</h2>

          <div style="background: #374151; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #fbbf24; margin-top: 0;">👤 MÜŞTERİ BİLGİLERİ</h3>
            <table style="width: 100%; color: #f9fafb;">
              <tr><td style="padding: 5px 0;"><strong>İsim:</strong></td><td>${fullName}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Email:</strong></td><td>${customerEmail}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Telefon:</strong></td><td>${result.buyer?.gsmNumber || '-'}</td></tr>
            </table>
          </div>

          <div style="background: #374151; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #60a5fa; margin-top: 0;">💳 ÖDEME BİLGİLERİ</h3>
            <table style="width: 100%; color: #f9fafb;">
              <tr><td style="padding: 5px 0;"><strong>Ödeme ID:</strong></td><td style="color: #10b981;">${result.paymentId}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Tutar:</strong></td><td style="color: #10b981; font-size: 18px; font-weight: bold;">${result.paidPrice} ₺</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Tarih:</strong></td><td>${new Date().toLocaleString('tr-TR')}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Durum:</strong></td><td style="color: #10b981;">✅ BAŞARILI</td></tr>
            </table>
          </div>

          <div style="background: #374151; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #f59e0b; margin-top: 0;">🛒 SİPARİŞ İÇERİĞİ</h3>
            <pre style="background: #111827; padding: 15px; border-radius: 6px; overflow-x: auto; color: #10b981; font-size: 12px; margin: 0;">${JSON.stringify(result.basketItems, null, 2)}</pre>
          </div>

          <hr style="border: none; border-top: 1px solid #4b5563; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">Pastırma Adası - Otomatik Admin Bildirimi</p>
        </div>
      `;

      const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
      console.log('📤 ADMİN\'E mail gönderiliyor:', adminEmail);

      const adminMailResult = await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `💰 Yeni Sipariş - ${fullName} - ${result.paidPrice}₺`,
        html: adminHTML,
        reply_to: customerEmail,
      });

      console.log('✅ Admin maili gönderildi:', adminMailResult.id);

      emailSent = true;
      console.log('🎉 TÜM MAİLLER BAŞARIYLA GÖNDERİLDİ!');

    } catch (error) {
      console.error('❌❌❌ MAİL GÖNDERİM HATASI:', error);
      console.error('Hata Türü:', error.name);
      console.error('Hata Mesajı:', error.message);
      console.error('Stack:', error.stack);

      if (error.statusCode) {
        console.error('HTTP Status:', error.statusCode);
      }

      emailError = error.message || 'Bilinmeyen mail hatası';
      emailSent = false;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RESPONSE HAZIRLA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const responseData = {
      status: 'success',
      paymentId: result.paymentId,
      paidPrice: result.paidPrice,
      paymentStatus: result.paymentStatus,
      emailSent: emailSent,
      emailError: emailError,
    };

    console.log('📤 RESPONSE GÖNDERİLİYOR:', responseData);
    console.log('Email Durumu:', emailSent ? '✅ BAŞARILI' : '❌ BAŞARISIZ');
    if (emailError) {
      console.log('Email Hatası:', emailError);
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥💥💥 GENEL HATA:', error);
    console.error('Hata Detayı:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        status: 'error',
        errorMessage: error.message || 'Sunucu hatası',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}