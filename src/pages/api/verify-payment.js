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
      console.log('📧 Mail gönderimi başlatılıyor...');
      console.log('RESEND_API_KEY var mı?', !!import.meta.env.RESEND_API_KEY);

      if (!import.meta.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY tanımlı değil');
      }

      const resend = new Resend(import.meta.env.RESEND_API_KEY);
      const customerEmail = result.buyer?.email;

      console.log('Müşteri email:', customerEmail);

      if (!customerEmail) {
        throw new Error('Müşteri email adresi bulunamadı');
      }

      const customerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">🎉 Ödemeniz Başarıyla Alındı!</h2>
          <p>Sayın ${result.buyer?.name || ''} ${result.buyer?.surname || ''},</p>
          <p>Ödemeniz başarıyla alınmıştır.</p>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
            <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
            <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          </div>

          <p>Teşekkür ederiz!</p>
          <p><em>Pastırma Adası</em></p>
        </div>
      `;

      console.log('Müşteriye mail gönderiliyor...');

      // Email validasyonu
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        throw new Error(`Geçersiz email formatı: ${customerEmail}`);
      }

      const { data: custData, error: custErr } = await resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: customerEmail,
        subject: `Odeme Onayi - ${result.paymentId}`, // Türkçe karakter kaldırıldı
        html: customerHTML,
        reply_to: 'successodysseyhub@gmail.com', // Reply-to eklendi
      });

      if (custErr) {
        console.error('❌ Müşteri mail hatası:', custErr);
        throw new Error(JSON.stringify(custErr));
      }

      console.log('✅ Müşteri maili gönderildi:', custData);

      const adminHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">💰 Yeni Ödeme Alındı</h2>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Müşteri:</strong> ${result.buyer?.name} ${result.buyer?.surname}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Telefon:</strong> ${result.buyer?.gsmNumber || '-'}</p>
            <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
            <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
            <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          </div>

          <h3>Sipariş Detayları:</h3>
          <pre>${JSON.stringify(result.basketItems, null, 2)}</pre>
        </div>
      `;

      const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
      console.log('Admin maili gönderiliyor:', adminEmail);

      // Admin email validasyonu
      if (!emailRegex.test(adminEmail)) {
        throw new Error(`Geçersiz admin email: ${adminEmail}`);
      }

      const { data: adminData, error: adminErr } = await resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `Yeni Odeme - ${result.paymentId}`, // Türkçe karakter kaldırıldı
        html: adminHTML,
        reply_to: customerEmail, // Müşteriye direkt cevap verilebilsin
      });

      if (adminErr) {
        console.error('❌ Admin mail hatası:', adminErr);
        throw new Error(JSON.stringify(adminErr));
      }

      console.log('✅ Admin maili gönderildi:', adminData);

      emailSent = true;
      console.log('✅ Tüm e-postalar başarıyla gönderildi');

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
      emailSent: emailSent,
      emailError: emailError || null,
      buyer: {
        name: result.buyer?.name,
        email: result.buyer?.email
      }
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