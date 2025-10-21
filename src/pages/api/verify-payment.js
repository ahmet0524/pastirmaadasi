import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(
        JSON.stringify({ status: 'error', errorMessage: 'Token eksik' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔍 Ödeme doğrulama başlatıldı, token:', token);

    // Iyzico yapılandırması
    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

    // Ödeme durumunu kontrol et
    console.log('📞 Iyzico API çağrılıyor...');
    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: Date.now().toString(),
          token,
        },
        (err, result) => {
          if (err) {
            console.error('❌ Iyzico hatası:', err);
            reject(err);
          } else {
            console.log('✅ Iyzico yanıtı alındı');
            resolve(result);
          }
        }
      );
    });

    console.log('📊 Ödeme durumu:', {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      buyerEmail: result.buyer?.email
    });

    // Ödeme başarısız kontrolü
    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      console.log('❌ Ödeme başarısız');
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: result.errorMessage || 'Ödeme başarısız',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Ödeme başarılı - Mail gönderimi başlasın
    console.log('✅ Ödeme başarılı, mail gönderimi başlatılıyor...');

    let emailSent = false;
    let emailError = null;

    // Mail gönderimi try-catch içinde
    try {
      // API key kontrolü
      if (!import.meta.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY tanımlı değil');
      }

      const customerEmail = result.buyer?.email;
      if (!customerEmail) {
        throw new Error('Müşteri email adresi bulunamadı');
      }

      console.log('📧 Mail gönderimi için hazırlık:', {
        from: 'siparis@successodysseyhub.com',
        to: customerEmail
      });

      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      // Müşteri maili HTML
      const customerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 10px;">
          <h2 style="color: #dc2626;">🎉 Ödemeniz Başarıyla Alındı!</h2>
          <p style="color: #374151;">Sayın ${result.buyer?.name || ''} ${result.buyer?.surname || ''},</p>
          <p style="color: #374151;">Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937;">Sipariş Detayları</h3>
            <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
            <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
            <p><strong>Durum:</strong> <span style="color: #10b981;">Başarılı</span></p>
            <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Siparişiniz en kısa sürede hazırlanacaktır.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Pastırma Adası Ekibi</p>
        </div>
      `;

      // Müşteriye mail gönder
      console.log('📤 Müşteriye mail gönderiliyor...');
      const customerResult = await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: customerEmail,
        subject: `Odeme Onayi - ${result.paymentId}`,
        html: customerHTML,
      });

      console.log('✅ Müşteri maili gönderildi:', customerResult.id);

      // Admin maili HTML
      const adminHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">💰 Yeni Ödeme Alındı</h2>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Müşteri:</strong> ${result.buyer?.name} ${result.buyer?.surname}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Telefon:</strong> ${result.buyer?.gsmNumber || '-'}</p>
            <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
            <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
            <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          </div>

          <h3>Sipariş İçeriği:</h3>
          <pre style="background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(result.basketItems, null, 2)}
          </pre>

          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">Pastırma Adası - Otomatik Bildirim</p>
        </div>
      `;

      // Admin'e mail gönder
      const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
      console.log('📤 Admin\'e mail gönderiliyor:', adminEmail);

      const adminResult = await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `Yeni Odeme - ${result.paymentId}`,
        html: adminHTML,
      });

      console.log('✅ Admin maili gönderildi:', adminResult.id);

      // Her şey başarılı
      emailSent = true;
      console.log('🎉 Tüm mailler başarıyla gönderildi!');

    } catch (error) {
      // Mail hatası
      console.error('❌ Mail gönderim hatası:', error);
      emailError = error.message;
      emailSent = false;
    }

    // Response hazırla
    const responseData = {
      status: 'success',
      paymentId: result.paymentId,
      paidPrice: result.paidPrice,
      paymentStatus: result.paymentStatus,
      emailSent: emailSent,
      emailError: emailError,
    };

    console.log('📤 Response gönderiliyor:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Genel hata:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        errorMessage: error.message || 'Sunucu hatası',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}