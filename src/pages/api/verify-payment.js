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

    // 📨 Mail gönderimi
    try {
      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      const html = `
        <div style="font-family: Arial; color:#333;">
          <h2>Ödemeniz Başarılı 🎉</h2>
          <p>Ödeme ID: <strong>${result.paymentId}</strong></p>
          <p>Tutar: <strong>${result.paidPrice}₺</strong></p>
          <hr/>
          <p>Pastırma Adası ekibi teşekkür eder.</p>
        </div>
      `;

      await resend.emails.send({
        from: import.meta.env.RESEND_FROM_EMAIL,
        to: import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com',
        subject: `Yeni Ödeme - ${result.paymentId}`,
        html,
      });

      console.log('✅ Mail başarıyla gönderildi.');
    } catch (emailError) {
      console.error('⚠️ E-posta gönderim hatası:', emailError.message);
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
