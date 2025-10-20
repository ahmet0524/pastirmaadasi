// src/pages/api/send-order-email.js
import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const body = await request.json();
    const { orderId, buyerEmail, buyerName, items, totalPrice } = body;

    if (!buyerEmail || !buyerName || !items || !totalPrice) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Eksik sipariş verisi gönderildi.',
        }),
        { status: 400 }
      );
    }

    // Sipariş özeti HTML
    const orderHTML = `
      <h2>Merhaba ${buyerName},</h2>
      <p>Siparişiniz başarıyla alınmıştır 🎉</p>
      <h3>Sipariş Özeti:</h3>
      <ul>
        ${items
          .map(
            (item) =>
              `<li>${item.name} - ${item.quantity} x ${item.price}₺</li>`
          )
          .join('')}
      </ul>
      <p><strong>Toplam Tutar:</strong> ${totalPrice}₺</p>
      <p><em>Sipariş ID:</em> ${orderId}</p>
      <hr/>
      <p>Pastırma Adası ekibi olarak teşekkür ederiz!</p>
    `;

    // Alıcıya mail
    const customerMail = await resend.emails.send({
      from: 'Pastırma Adası <noreply@pastirmaadasi.com>',
      to: buyerEmail,
      subject: `Sipariş Onayı #${orderId}`,
      html: orderHTML,
    });

    // Satıcıya bilgi maili
    const adminMail = await resend.emails.send({
      from: 'Pastırma Adası <noreply@pastirmaadasi.com>',
      to: 'ayavuz0524@gmail.com',
      subject: `Yeni Sipariş Alındı #${orderId}`,
      html: `
        <h3>Yeni sipariş alındı:</h3>
        <p><strong>Müşteri:</strong> ${buyerName}</p>
        <p><strong>E-posta:</strong> ${buyerEmail}</p>
        <p><strong>Toplam:</strong> ${totalPrice}₺</p>
        <ul>
          ${items
            .map(
              (item) =>
                `<li>${item.name} (${item.quantity} x ${item.price}₺)</li>`
            )
            .join('')}
        </ul>
      `,
    });

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'E-postalar başarıyla gönderildi.',
        customerMail,
        adminMail,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ E-posta gönderim hatası:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'E-posta gönderimi başarısız oldu.',
        error: error.message,
      }),
      { status: 500 }
    );
  }
}
