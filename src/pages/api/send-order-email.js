import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { orderId, buyerEmail, buyerName, items, totalPrice } = body;

    if (!buyerEmail) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'buyerEmail eksik veya geçersiz'
      }), { status: 400 });
    }

    if (!import.meta.env.RESEND_API_KEY) {
      console.error('⚠️ RESEND_API_KEY tanımlı değil');
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Sunucu yapılandırma hatası (API key eksik)'
      }), { status: 500 });
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const orderDetails = items?.map(i => `<li>${i.name} - ${i.price}₺ x ${i.quantity}</li>`).join('') || '';
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>🧾 Sipariş Onayı</h2>
        <p>Sayın ${buyerName || 'Müşterimiz'}, siparişiniz başarıyla alındı.</p>
        <ul>${orderDetails}</ul>
        <p><strong>Toplam:</strong> ${totalPrice}₺</p>
      </div>
    `;

    let emailSent = false;
    let emailError = null;

    try {
      const { data, error } = await resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: buyerEmail,
        subject: `Sipariş Onayı - ${orderId}`,
        html,
      });

      if (error) throw new Error(error.message);
      emailSent = true;
      console.log('✅ E-posta gönderildi:', data?.id);
    } catch (err) {
      emailError = err.message;
      console.error('❌ E-posta gönderim hatası:', err);
    }

    return new Response(JSON.stringify({
      status: 'success',
      emailSent,
      emailError
    }), { status: 200 });

  } catch (err) {
    console.error('💥 Sunucu hatası:', err);
    return new Response(JSON.stringify({
      status: 'error',
      emailSent: false,
      emailError: err.message || 'Sunucu hatası'
    }), { status: 500 });
  }
}
