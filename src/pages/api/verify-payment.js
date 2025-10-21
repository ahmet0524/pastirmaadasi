import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(JSON.stringify({ status: 'error', errorMessage: 'Token eksik' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Ödeme doğrulama başlatıldı...', { token });

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

    console.log('✅ Iyzico sonucu:', {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      buyerEmail: result.buyer?.email
    });

    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      console.log('❌ Ödeme başarısız:', result.errorMessage);
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: result.errorMessage || 'Ödeme başarısız',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 📧 Başarılı ödeme sonrası mail gönderimi
    let emailSent = false;
    let emailError = null;

    try {
      if (!import.meta.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY tanımlı değil');
      }

      const resend = new Resend(import.meta.env.RESEND_API_KEY);
      const customerEmail = result.buyer?.email;

      if (!customerEmail) {
        throw new Error('Müşteri email adresi bulunamadı');
      }

      const customerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h2>🎉 Ödemeniz Başarıyla Alındı!</h2>
          <p>Sayın ${result.buyer?.name || ''}, ödemeniz başarıyla alınmıştır.</p>
          <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
          <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
          <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
        </div>
      `;

      const { data: custData, error: custErr } = await resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: customerEmail,
        subject: `✅ Ödeme Onayı - ${result.paymentId}`,
        html: customerHTML,
      });

      if (custErr) throw new Error(custErr.message || 'Müşteri e-postası gönderilemedi');

      const adminHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h2>💰 Yeni Ödeme Alındı</h2>
          <p><strong>Müşteri:</strong> ${result.buyer?.name} ${result.buyer?.surname}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
        </div>
      `;

      const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
      const { data: adminData, error: adminErr } = await resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `🔔 Yeni Ödeme - ${result.paymentId}`,
        html: adminHTML,
      });

      if (adminErr) throw new Error(adminErr.message || 'Admin e-postası gönderilemedi');

      emailSent = true;
      console.log('✅ Tüm e-postalar gönderildi:', { custData, adminData });

    } catch (mailErr) {
      emailError = mailErr.message;
      emailSent = false;
      console.error('❌ Mail hatası:', mailErr);
    }

    const responseData = {
      status: 'success',
      paymentId: result.paymentId,
      paidPrice: result.paidPrice,
      paymentStatus: result.paymentStatus,
      emailSent,
      emailError,
    };

    console.log('📤 Gönderilen response:', responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Sunucu hatası:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        errorMessage: error.message || 'Sunucu hatası',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
