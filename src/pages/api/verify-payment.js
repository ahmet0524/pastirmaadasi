import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(
        JSON.stringify({ status: 'error', errorMessage: 'Token eksik' }),
        { status: 400 }
      );
    }

    console.log('🔍 Ödeme doğrulama başlatıldı...');

    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

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

    console.log('✅ Iyzico sonucu:', result);

    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: result.errorMessage || 'Ödeme başarısız',
        }),
        { status: 400 }
      );
    }

    // 📨 SADECE BAŞARILI ÖDEME SONRASI MAİL GÖNDER
    try {
      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      // Kullanıcıya mail
      const customerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
          <h2 style="color: #dc2626;">🎉 Ödemeniz Başarıyla Alındı!</h2>
          <p style="color: #374151;">Merhaba,</p>
          <p style="color: #374151;">Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937;">Sipariş Detayları</h3>
            <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
            <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
            <p><strong>Durum:</strong> <span style="color: #10b981;">Başarılı</span></p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Siparişiniz en kısa sürede hazırlanacaktır.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Pastırma Adası ekibi</p>
        </div>
      `;

      // Müşteriye mail gönder
      await resend.emails.send({
        from: import.meta.env.RESEND_FROM_EMAIL || 'Pastırma Adası <noreply@pastirmaadasi.com>',
        to: result.buyer?.email || 'ayavuz0524@gmail.com',
        subject: `✅ Ödeme Onayı - ${result.paymentId}`,
        html: customerHTML,
      });

      // Admin'e bildirim maili
      const adminHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h2>💰 Yeni Ödeme Alındı</h2>
          <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
          <p><strong>Müşteri:</strong> ${result.buyer?.email || 'Bilinmiyor'}</p>
          <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
          <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          <hr/>
          <p style="color: #6b7280;">Pastırma Adası - Otomatik Bildirim</p>
        </div>
      `;

      await resend.emails.send({
        from: import.meta.env.RESEND_FROM_EMAIL || 'Pastırma Adası <noreply@pastirmaadasi.com>',
        to: import.meta.env.ADMIN_EMAIL || 'ayavuz0524@gmail.com',
        subject: `🔔 Yeni Ödeme - ${result.paymentId}`,
        html: adminHTML,
      });

      console.log('✅ E-postalar başarıyla gönderildi.');
    } catch (emailError) {
      console.error('⚠️ E-posta gönderim hatası:', emailError.message);
      // Mail hatası ödemeyi iptal etmemeli, sadece loglansın
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        paymentId: result.paymentId,
        paidPrice: result.paidPrice,
        paymentStatus: result.paymentStatus,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('💥 Sunucu hatası:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        errorMessage: error.message || 'Sunucu hatası',
      }),
      { status: 500 }
    );
  }
}