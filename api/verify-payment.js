import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

// Email gönderme fonksiyonu
async function sendOrderEmails(orderData, paymentResult) {
  console.log('📧 === EMAIL SENDING START ===');
  console.log('Order data:', JSON.stringify(orderData, null, 2));
  console.log('Payment result:', JSON.stringify(paymentResult, null, 2));

  try {
    // API Key kontrolü
    const apiKey = process.env.RESEND_API_KEY;
    console.log('RESEND_API_KEY exists:', !!apiKey);
    console.log('RESEND_API_KEY length:', apiKey ? apiKey.length : 0);
    console.log('RESEND_API_KEY prefix:', apiKey ? apiKey.substring(0, 5) + '...' : 'N/A');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY not found in environment variables');
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const adminEmail = process.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';

    console.log('From email:', fromEmail);
    console.log('Admin email:', adminEmail);

    const resend = new Resend(apiKey);
    console.log('✅ Resend instance created');

    const { customerEmail, customerName, customerPhone, customerAddress, items } = orderData;

    console.log('Customer email:', customerEmail);
    console.log('Customer name:', customerName);
    console.log('Items count:', items?.length);

    // Ürün listesi HTML
    const itemsHtml = items.map(item => {
      console.log(`Processing item: ${item.name} x${item.quantity} @ ${item.price}₺`);
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.price}₺</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toFixed(2)}₺</td>
        </tr>
      `;
    }).join('');

    console.log('✅ Items HTML generated');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sipariş Onayı</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <div style="background-color: #dc2626; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Pastırma Adası</h1>
            <p style="color: #fee2e2; margin: 10px 0 0 0;">Siparişiniz Alındı!</p>
          </div>
          <div style="padding: 40px 20px;">
            <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">Merhaba ${customerName || 'Değerli Müşterimiz'},</p>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 30px 0;">
              Siparişiniz başarıyla alındı. Ödemeniz onaylandı ve siparişiniz en kısa sürede hazırlanacaktır.
            </p>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="font-size: 18px; color: #1f2937; margin: 0 0 15px 0;">Sipariş Detayları</h2>
              <table style="width: 100%; margin-bottom: 15px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ödeme ID:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">${paymentResult.paymentId}</td>
                </tr>
                ${customerPhone ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Telefon:</td><td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${customerPhone}</td></tr>` : ''}
                ${customerAddress ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Adres:</td><td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${customerAddress}</td></tr>` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Sipariş Tarihi:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              </table>
            </div>
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
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 15px 12px; text-align: right; font-size: 16px; font-weight: 600; color: #1f2937;">Genel Toplam:</td>
                  <td style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: 700; color: #dc2626;">${paymentResult.paidPrice}₺</td>
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
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              &copy; ${new Date().getFullYear()} Pastırma Adası. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('✅ Customer email HTML generated, length:', emailHtml.length);

    // Admin email HTML
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Yeni Sipariş</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #dc2626;">🛒 Yeni Sipariş Alındı!</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Müşteri Bilgileri:</h3>
          <p><strong>Ad Soyad:</strong> ${customerName || 'Belirtilmemiş'}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Telefon:</strong> ${customerPhone || 'Belirtilmemiş'}</p>
          ${customerAddress ? `<p><strong>Adres:</strong> ${customerAddress}</p>` : ''}
          <p><strong>Ödeme ID:</strong> ${paymentResult.paymentId}</p>
          <p><strong>Toplam Tutar:</strong> <strong style="color: #dc2626; font-size: 18px;">${paymentResult.paidPrice}₺</strong></p>
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
        <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">Sipariş Zamanı: ${new Date().toLocaleString('tr-TR')}</p>
      </body>
      </html>
    `;

    console.log('✅ Admin email HTML generated');

    // Müşteriye email gönder
    console.log('📤 Sending customer email...');
    console.log('To:', customerEmail);
    console.log('From:', fromEmail);
    console.log('Subject:', `Sipariş Onayı - ${paymentResult.paymentId}`);

    const customerResult = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Sipariş Onayı - ${paymentResult.paymentId}`,
      html: emailHtml
    });

    console.log('✅ Customer email sent successfully!');
    console.log('Customer email ID:', customerResult.id);

    // Admin'e email gönder
    console.log('📤 Sending admin email...');
    console.log('To:', adminEmail);

    const adminResult = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `🛒 Yeni Sipariş - ${customerName || customerEmail}`,
      html: adminEmailHtml
    });

    console.log('✅ Admin email sent successfully!');
    console.log('Admin email ID:', adminResult.id);
    console.log('📧 === EMAIL SENDING COMPLETE ===');

    return {
      success: true,
      customerEmailId: customerResult.id,
      adminEmailId: adminResult.id
    };

  } catch (error) {
    console.error('❌ === EMAIL SENDING FAILED ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

export default async function handler(req, res) {
  console.log('🚀 === VERIFY PAYMENT START ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({
      status: 'error',
      errorMessage: 'Method Not Allowed'
    });
  }

  try {
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    const { token, orderData } = req.body;

    if (!token) {
      console.error('❌ No token provided');
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Token bulunamadı'
      });
    }

    console.log('✅ Token received:', token.substring(0, 10) + '...');
    console.log('Order data present:', !!orderData);

    // Environment variables check
    console.log('🔐 Environment Variables Check:');
    console.log('IYZICO_API_KEY:', process.env.IYZICO_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('IYZICO_SECRET_KEY:', process.env.IYZICO_SECRET_KEY ? '✅ Set' : '❌ Missing');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'Using default');
    console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'Using default');

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    console.log('✅ Iyzipay instance created');

    return new Promise((resolve) => {
      console.log('📞 Calling Iyzico API...');

      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: Date.now().toString(),
        token: token
      }, async (err, result) => {
        if (err) {
          console.error('❌ Iyzico error:', JSON.stringify(err, null, 2));
          res.status(400).json({
            status: 'error',
            errorMessage: err.errorMessage || 'Doğrulama başarısız'
          });
          resolve();
          return;
        }

        console.log('✅ Iyzico response received');
        console.log('Status:', result.status);
        console.log('Payment status:', result.paymentStatus);
        console.log('Payment ID:', result.paymentId);
        console.log('Paid price:', result.paidPrice);

        if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
          console.log('✅ Payment successful!');

          // Email gönder
          if (orderData) {
            try {
              console.log('📧 Starting email process...');
              const emailResult = await sendOrderEmails(orderData, result);
              console.log('✅ Email process completed:', emailResult);
            } catch (emailError) {
              console.error('❌ Email process failed but payment was successful');
              console.error('Email error:', emailError.message);
              // Email hatası ödeme başarısını etkilemez
            }
          } else {
            console.warn('⚠️ No order data provided, skipping email');
          }

          console.log('📤 Sending success response to client');
          res.status(200).json({
            status: 'success',
            paymentId: result.paymentId,
            price: result.price,
            paidPrice: result.paidPrice,
            paymentStatus: result.paymentStatus
          });
        } else {
          console.log('❌ Payment failed');
          console.log('Error message:', result.errorMessage);
          res.status(400).json({
            status: 'error',
            errorMessage: result.errorMessage || 'Ödeme başarısız',
            paymentStatus: result.paymentStatus
          });
        }

        console.log('🏁 === VERIFY PAYMENT END ===');
        resolve();
      });
    });
  } catch (error) {
    console.error('❌ === VERIFICATION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + error.message
    });
  }
}