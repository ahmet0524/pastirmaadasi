// src/pages/api/send-order-email.js
// ⚠️ Bu dosya SADECE admin panelinden kargo takip numarası göndermek için kullanılır
// Sipariş emaili verify-payment.js içinde gönderilir

import { Resend } from 'resend';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Kargo Takip Email Template
function getTrackingEmailHTML({ customerName, orderNumber, trackingNumber, trackingUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #4CAF50; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px 20px; background: #f9f9f9; }
    .tracking-box { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; text-align: center; border: 3px dashed #4CAF50; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .tracking-number { font-size: 32px; font-weight: bold; color: #4CAF50; margin: 20px 0; letter-spacing: 2px; font-family: monospace; }
    .button { display: inline-block; padding: 15px 40px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
    .button:hover { background: #45a049; }
    .info-box { background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 13px; background: white; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Siparişiniz Kargoda!</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px;">Merhaba <strong>${customerName}</strong>,</p>
      <p>Harika haber! Sipariş numarası <strong>#${orderNumber}</strong> olan siparişiniz kargoya verildi! 🎉</p>

      <div class="tracking-box">
        <p style="font-size: 16px; color: #666; margin-top: 0;">🚚 Kargo Takip Numaranız:</p>
        <div class="tracking-number">${trackingNumber}</div>
        <p style="font-size: 14px; color: #666;">Kargonuzu bu numara ile takip edebilirsiniz</p>
        ${trackingUrl ? `<a href="${trackingUrl}" class="button" target="_blank">🔍 Kargoyu Takip Et</a>` : ''}
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>📌 Bilgi:</strong> Kargonuz 2-5 iş günü içinde adresinize teslim edilecektir.</p>
      </div>

      <p style="margin-top: 30px;">Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz!</p>
      <p>Afiyet olsun! 🙏</p>
    </div>
    <div class="footer">
      <p><strong>Pastırma Adası</strong><br>successodysseyhub.com</p>
      <p style="font-size: 11px; color: #999; margin-top: 10px;">Sorularınız için bize ulaşabilirsiniz.</p>
    </div>
  </div>
</body>
</html>
`;
}

// ⚠️ POST metodu kaldırıldı - Sipariş emaili verify-payment.js'de gönderiliyor
// Bu endpoint sadece PUT (kargo takip) için kullanılır

export async function PUT({ request }) {
  try {
    const body = await request.json();
    const { customerEmail, customerName, orderNumber, trackingNumber, trackingUrl } = body;

    // Validasyon
    if (!customerEmail || !trackingNumber || !orderNumber) {
      return new Response(
        JSON.stringify({
          error: 'Email, sipariş no ve takip numarası gerekli',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Kargo takip emaili gönderiliyor:', { customerEmail, orderNumber, trackingNumber });

    // Kargo takip emaili gönder
    const response = await resend.emails.send({
      from: 'Pastırma Adası <siparis@successodysseyhub.com>',
      to: customerEmail,
      subject: `📦 Kargoya Verildi - Sipariş #${orderNumber}`,
      html: getTrackingEmailHTML({
        customerName: customerName || 'Değerli Müşterimiz',
        orderNumber,
        trackingNumber,
        trackingUrl
      })
    });

    console.log('✅ Kargo takip emaili gönderildi:', response.data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: response.data?.id,
        message: 'Kargo takip emaili başarıyla gönderildi'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Kargo email hatası:', error);
    return new Response(
      JSON.stringify({
        error: 'Email gönderilemedi',
        details: error.message,
        success: false
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}