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
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log('🔍 Ödeme doğrulama başlatıldı...', { token });

    // Iyzico yapılandırması
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

    console.log('✅ Iyzico sonucu:', {
      status: result.status,
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      buyerEmail: result.buyer?.email
    });

    // Ödeme başarısız ise
    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      console.log('❌ Ödeme başarısız:', result.errorMessage);
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: result.errorMessage || 'Ödeme başarısız',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // 📧 BAŞARILI ÖDEME SONRASI MAİL GÖNDER
    let emailSent = false;
    let emailError = null;

    // Resend API key kontrolü
    if (!import.meta.env.RESEND_API_KEY) {
      console.error('⚠️ RESEND_API_KEY tanımlı değil!');
      emailError = 'RESEND_API_KEY tanımlı değil';
    } else {
      try {
        const resend = new Resend(import.meta.env.RESEND_API_KEY);

        // Müşteri email adresi kontrolü
        const customerEmail = result.buyer?.email;
        if (!customerEmail) {
          console.warn('⚠️ Müşteri email adresi bulunamadı!');
          emailError = 'Müşteri email adresi bulunamadı';
        } else {
          console.log('📧 Mail gönderimi başlatılıyor...', { customerEmail });

          // Müşteriye mail
          const customerHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
              <h2 style="color: #dc2626;">🎉 Ödemeniz Başarıyla Alındı!</h2>
              <p style="color: #374151;">Merhaba ${result.buyer?.name || ''},</p>
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
              <p style="color: #9ca3af; font-size: 12px;">Pastırma Adası ekibi</p>
            </div>
          `;

          const customerMailResult = await resend.emails.send({
            from: 'Pastırma Adası <siparis@successodysseyhub.com>',
            to: customerEmail,
            subject: `✅ Ödeme Onayı - ${result.paymentId}`,
            html: customerHTML,
          });

          console.log('✅ Müşteriye mail gönderildi:', {
            customerEmail,
            messageId: customerMailResult.id
          });

          // Admin'e bildirim maili
          const adminHTML = `
            <div style="font-family: Arial, sans-serif;">
              <h2>💰 Yeni Ödeme Alındı</h2>
              <p><strong>Ödeme ID:</strong> ${result.paymentId}</p>
              <p><strong>Müşteri:</strong> ${result.buyer?.name} ${result.buyer?.surname}</p>
              <p><strong>Email:</strong> ${customerEmail}</p>
              <p><strong>Tutar:</strong> ${result.paidPrice} ₺</p>
              <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
              <hr/>
              <h3>Ürünler:</h3>
              <ul>
                ${result.basketItems?.map(item => `<li>${item.name} - ${item.price} ₺</li>`).join('') || '<li>Bilgi yok</li>'}
              </ul>
              <hr/>
              <p style="color: #6b7280;">Pastırma Adası - Otomatik Bildirim</p>
            </div>
          `;

          const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
          const adminMailResult = await resend.emails.send({
            from: 'Pastırma Adası <siparis@successodysseyhub.com>',
            to: adminEmail,
            subject: `🔔 Yeni Ödeme - ${result.paymentId}`,
            html: adminHTML,
          });

          console.log('✅ Admin\'e mail gönderildi:', {
            adminEmail,
            messageId: adminMailResult.id
          });

          // Her iki mail de başarılı
          emailSent = true;
        }
      } catch (error) {
        console.error('❌ E-posta gönderim hatası:', error);
        console.error('Hata detayı:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        emailError = error.message || 'E-posta gönderilemedi';
        emailSent = false; // Açıkça false olarak işaretle
      }
    }

    // Başarılı yanıt (mail hatası olsa bile ödeme başarılı)
    const responseData = {
      status: 'success',
      paymentId: result.paymentId,
      paidPrice: result.paidPrice,
      paymentStatus: result.paymentStatus,
      emailSent: emailSent,
      emailError: emailError,
    };

    console.log('📤 Gönderilen response:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('💥 Sunucu hatası:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        errorMessage: error.message || 'Sunucu hatası',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}