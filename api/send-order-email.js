import { Resend } from 'resend';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      errorMessage: 'Method Not Allowed'
    });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const {
      customerEmail,
      customerName,
      customerPhone,
      customerAddress,
      items,
      totalPrice,
      paymentId
    } = req.body;

    if (!customerEmail || !items || !totalPrice) {
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Gerekli bilgiler eksik'
      });
    }

    // Ürün listesi HTML
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${item.name}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${item.price}₺
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${(item.price * item.quantity).toFixed(2)}₺
        </td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sipariş Onayı</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background-color: #dc2626; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Manav Yüzbaşıoğlu</h1>
            <p style="color: #fee2e2; margin: 10px 0 0 0;">Siparişiniz Alındı!</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 20px;">
            <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">
              Merhaba ${customerName || 'Değerli Müşterimiz'},
            </p>

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 30px 0;">
              Siparişiniz başarıyla alındı. Ödemeniz onaylandı ve siparişiniz en kısa sürede hazırlanacaktır.
            </p>

            <!-- Order Details -->
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="font-size: 18px; color: #1f2937; margin: 0 0 15px 0;">Sipariş Detayları</h2>

              <table style="width: 100%; margin-bottom: 15px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ödeme ID:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">
                    ${paymentId || 'N/A'}
                  </td>
                </tr>
                ${customerPhone ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Telefon:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">
                    ${customerPhone}
                  </td>
                </tr>
                ` : ''}
                ${customerAddress ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Adres:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">
                    ${customerAddress}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Sipariş Tarihi:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">
                    ${new Date().toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Products Table -->
            <h2 style="font-size: 18px; color: #1f2937; margin: 0 0 15px 0;">Sipariş İçeriği</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280; font-weight: 600;">Ürün</th>
                  <th style="padding: 12px; text-align: center; font-size: 14px; color: #6b7280; font-weight: 600;">Adet</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #6b7280; font-weight: 600;">Fiyat</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #6b7280; font-weight: 600;">Toplam</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 15px 12px; text-align: right; font-size: 16px; font-weight: 600; color: #1f2937;">
                    Genel Toplam:
                  </td>
                  <td style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: 700; color: #dc2626;">
                    ${totalPrice}₺
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                <strong>Not:</strong> Siparişiniz hazırlandığında size tekrar bilgi verilecektir.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 30px 0 0 0;">
              Sorularınız için bizimle iletişime geçebilirsiniz.<br>
              <strong>Telefon:</strong> 0352 220 59 36<br>
              <strong>Adres:</strong> Fatih, Talas Cd. 129 C, 38030 Melikgazi/Kayseri
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              &copy; ${new Date().getFullYear()} Manav Yüzbaşıoğlu. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Müşteriye email gönder
    const customerEmailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'siparis@successodysseyhub.com',
      to: customerEmail,
      subject: `Sipariş Onayı - ${paymentId || new Date().getTime()}`,
      html: emailHtml
    });

    // İşletmeye bildirim emaili
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Yeni Sipariş</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #dc2626;">🛒 Yeni Sipariş Alındı!</h2>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Müşteri Bilgileri:</h3>
          <p><strong>Ad Soyad:</strong> ${customerName || 'Belirtilmemiş'}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Telefon:</strong> ${customerPhone || 'Belirtilmemiş'}</p>
          ${customerAddress ? `<p><strong>Adres:</strong> ${customerAddress}</p>` : ''}
          <p><strong>Ödeme ID:</strong> ${paymentId || 'N/A'}</p>
          <p><strong>Toplam Tutar:</strong> <strong style="color: #dc2626; font-size: 18px;">${totalPrice}₺</strong></p>
        </div>

        <h3>Sipariş İçeriği:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Ürün</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">Adet</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Fiyat</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Toplam</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.name}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${item.price}₺</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${(item.price * item.quantity).toFixed(2)}₺</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
          Sipariş Zamanı: ${new Date().toLocaleString('tr-TR')}
        </p>
      </body>
      </html>
    `;

    // İşletme emailini environment variable'dan al
    const adminEmail = process.env.ADMIN_EMAIL || 'info@manavyuzbasioglu.com';

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'siparis@successodysseyhub.com',
      to: adminEmail,
      subject: `🛒 Yeni Sipariş - ${customerName || customerEmail}`,
      html: adminEmailHtml
    });

    return res.status(200).json({
      status: 'success',
      message: 'Email başarıyla gönderildi',
      emailId: customerEmailResult.id
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Email gönderilemedi: ' + error.message
    });
  }
}