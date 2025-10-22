import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

export async function POST({ request }) {
  console.log('🚀 VERIFY-PAYMENT V3.0 - WITH EMAIL SYSTEM');

  try {
    const body = await request.json();
    const { token, customerEmail: frontendEmail } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ status: 'error', errorMessage: 'Token eksik' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Ödeme doğrulama başlatıldı');
    console.log('📧 Frontend email:', frontendEmail);

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

    // ✅ ÖDEME BAŞARILI - MAİL GÖNDERİMİ BAŞLASIN
    let emailSent = false;
    let emailError = null;

    try {
      if (!import.meta.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY tanımlı değil');

      // Email'i İyzico'dan al, yoksa frontend'den al
      let customerEmail = result.buyer?.email;

      if (!customerEmail || customerEmail.trim() === '') {
        console.warn('⚠️ İyzico\'dan email gelmiyor, frontend\'den alınıyor...');
        customerEmail = frontendEmail;
      }

      if (!customerEmail || customerEmail.trim() === '') {
        throw new Error('Müşteri email adresi bulunamadı');
      }

      console.log('📧 Mail gönderilecek adres:', customerEmail);

      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      // Müşteri maili HTML
      const customerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 10px;">
          <h2 style="color: #dc2626;">🎉 Ödemeniz Başarıyla Alındı!</h2>
          <p>Sayın ${result.buyer?.name || ''} ${result.buyer?.surname || ''},</p>
          <p>Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz.</p>

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
      await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: customerEmail,
        subject: `Odeme Onayi - ${result.paymentId}`,
        html: customerHTML,
      });
      console.log('✅ Müşteri maili gönderildi');

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

      await resend.emails.send({
        from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `Yeni Odeme - ${result.paymentId}`,
        html: adminHTML,
      });
      console.log('✅ Admin maili gönderildi');

      emailSent = true;
      console.log('🎉 Tüm mailler başarıyla gönderildi!');

    } catch (error) {
      console.error('❌ Mail hatası:', error);
      emailError = error.message;
    }

    // Response
    const responseData = {
      status: 'success',
      paymentId: result.paymentId,
      paidPrice: result.paidPrice,
      paymentStatus: result.paymentStatus,
      emailSent: emailSent,
      emailError: emailError,
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