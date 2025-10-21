import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { orderId, buyerEmail, buyerName, items, totalPrice } = body;

    if (!buyerEmail) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Alıcı e-posta adresi eksik'
      }), { status: 400 });
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const orderDetails = items?.map(i => `<li>${i.name} - ${i.price} ₺ x ${i.quantity}</li>`).join('') || 'Ürün bilgisi yok';

    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>🧾 Yeni Sipariş Onayı</h2>
        <p>Sayın ${buyerName || ''}, siparişiniz başarıyla alındı.</p>
        <p><strong>Sipariş No:</strong> ${orderId}</p>
        <ul>${orderDetails}</ul>
        <p><strong>Toplam:</strong> ${totalPrice} ₺</p>
        <p>Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz!</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Pastırma Adası <siparis@successodysseyhub.com>',
      to: buyerEmail,
      subject: `Sipariş Onayı - ${orderId}`,
      html,
    });

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({
      status: 'success',
      emailSent: true,
      data
    }), { status: 200 });

  } catch (err) {
    console.error('E-posta gönderim hatası:', err);
    return new Response(JSON.stringify({
      status: 'error',
      emailSent: false,
      error: err.message || 'Bilinmeyen hata'
    }), { status: 500 });
  }
}
