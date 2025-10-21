import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

export async function POST({ request }) {
  console.log('🚀 VERIFY-PAYMENT V2.1 - EMAIL RESPONSE INCLUDED');

  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(
        JSON.stringify({ status: 'error', errorMessage: 'Token eksik' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Ödeme doğrulama başlatıldı, token:', token);

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

    console.log('📊 Ödeme durumu:', {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      buyerEmail: result.buyer?.email
    });

    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      return new Response(
        JSON.stringify({ status: 'error', errorMessage: result.errorMessage || 'Ödeme başarısız' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mail gönderimi
    let emailSent = false;
    let emailError = null;

    try {
      if (!import.meta.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY tanımlı değil');

      const customerEmail = result.buyer?.email;
      if (!customerEmail) throw new Error('Müşteri email adresi bulunamadı');

      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      const customerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 10px;">
          <h2 style="color: #dc2626;">🎉 Ödemeniz Başarıyla Alındı!</h2>
          <p>Sayın ${result.buyer?.name || ''} ${result.buyer?.surname || ''},</p>
          <p>Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937;">Sipariş Detayları</h3>
            <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
            <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
            <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Siparişiniz en kısa sürede hazırlanacaktır.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Pastırma Adası Ekibi</p>
        </div>
      `;

      await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: customerEmail,
        subject: `Odeme Onayi - ${result.paymentId}`,
        html: customerHTML,
      });
      console.log('✅ Müşteri maili gönderildi');

      const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
      await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `Yeni Odeme - ${result.paymentId}`,
        html: `
          <h2>💰 Yeni Ödeme Alındı</h2>
          <p><strong>Müşteri:</strong> ${result.buyer?.name} ${result.buyer?.surname}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
          <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
        `,
      });
      console.log('✅ Admin maili gönderildi');

      emailSent = true;
    } catch (error) {
      console.error('❌ Mail hatası:', error);
      emailError = error.message;
    }

    // ⚠️ ÖNEMLİ: emailSent ve emailError mutlaka response'da olmalı
    const responseData = {
      status: 'success',
      paymentId: result.paymentId,
      paidPrice: result.paidPrice,
      paymentStatus: result.paymentStatus,
      emailSent: emailSent,        // ZORUNLU
      emailError: emailError,      // ZORUNLU
    };

    console.log('📤 Response:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Hata:', error);
    return new Response(
      JSON.stringify({ status: 'error', errorMessage: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}