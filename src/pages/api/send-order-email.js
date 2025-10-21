import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { orderId, buyerEmail, buyerName, items, totalPrice } = body;

    console.log('📧 Mail gönderimi başlatılıyor...', {
      orderId,
      buyerEmail,
      buyerName,
      itemsCount: items?.length,
      totalPrice
    });

    // ⚠️ ÖNEMLİ: Email validasyonu
    if (!buyerEmail || buyerEmail.trim() === '') {
      console.error('❌ BUYER EMAIL EKSİK VEYA BOŞ!');
      return new Response(JSON.stringify({
        status: 'error',
        message: 'buyerEmail eksik veya boş',
        emailSent: false,
        emailError: 'Email adresi gereklidir'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      console.error('❌ GEÇERSİZ EMAIL FORMATI:', buyerEmail);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Geçersiz email formatı',
        emailSent: false,
        emailError: `Geçersiz email: ${buyerEmail}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API Key kontrolü
    if (!import.meta.env.RESEND_API_KEY) {
      console.error('⚠️ RESEND_API_KEY tanımlı değil');
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Sunucu yapılandırma hatası (API key eksik)',
        emailSent: false,
        emailError: 'RESEND_API_KEY bulunamadı'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const orderDetails = items?.map(i =>
      `<li style="margin: 10px 0;">${i.name} - ${i.price}₺ x ${i.quantity} = ${i.price * i.quantity}₺</li>`
    ).join('') || '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">🧾 Sipariş Onayı</h2>
        <p>Sayın ${buyerName || 'Müşterimiz'},</p>
        <p>Siparişiniz başarıyla alındı.</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Sipariş Detayları:</h3>
          <ul style="list-style: none; padding: 0;">
            ${orderDetails}
          </ul>
          <hr style="border: 1px solid #ddd; margin: 15px 0;">
          <p style="font-size: 18px;"><strong>Toplam: ${totalPrice}₺</strong></p>
          <p style="font-size: 14px; color: #666;"><strong>Sipariş No:</strong> ${orderId}</p>
        </div>

        <p>Teşekkür ederiz!</p>
        <p><em>Pastırma Adası</em></p>
      </div>
    `;

    console.log('📤 Resend ile mail gönderiliyor...', { to: buyerEmail });

    const { data, error } = await resend.emails.send({
      from: 'Pastirma Adasi <siparis@successodysseyhub.com>',
      to: buyerEmail,
      subject: `Siparis Onayi - ${orderId}`,
      html,
      reply_to: 'successodysseyhub@gmail.com',
    });

    if (error) {
      console.error('❌ Resend hatası:', error);
      throw new Error(JSON.stringify(error));
    }

    console.log('✅ E-posta başarıyla gönderildi:', data?.id);

    return new Response(JSON.stringify({
      status: 'success',
      emailSent: true,
      emailError: null,
      messageId: data?.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('💥 Sunucu hatası:', err);
    return new Response(JSON.stringify({
      status: 'error',
      emailSent: false,
      emailError: err.message || 'Sunucu hatası'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}