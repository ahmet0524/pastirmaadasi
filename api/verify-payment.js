import Iyzipay from 'iyzipay';

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
    console.log('🔍 === PAYMENT VERIFICATION STARTED ===');

    const { token, orderData } = req.body;

    if (!token) {
      console.error('❌ No token provided');
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Token bulunamadı'
      });
    }

    console.log('📦 Order data received:', orderData ? 'Yes' : 'No');

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    return new Promise((resolve) => {
      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: Date.now().toString(),
        token: token
      }, async (err, result) => {
        if (err) {
          console.error('❌ Iyzico error:', err);
          res.status(400).json({
            status: 'error',
            errorMessage: err.errorMessage || 'Doğrulama başarısız'
          });
          resolve();
          return;
        }

        console.log('✅ Payment status:', result.paymentStatus);

        if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
          console.log('💰 Payment successful! Sending email...');

          // ✅ Ödeme başarılı - Email gönder
          if (orderData) {
            try {
              const emailPayload = {
                customerEmail: orderData.customerEmail,
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                customerAddress: orderData.customerAddress,
                items: orderData.items,
                totalPrice: result.paidPrice,
                paymentId: result.paymentId
              };

              console.log('📧 Email payload prepared');

              // ✅ DÜZELTİLDİ: Absolute URL oluştur
              const baseUrl = process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : 'http://localhost:3000';

              const emailApiUrl = `${baseUrl}/api/send-order-email`;

              console.log('📤 Email API URL:', emailApiUrl);

              const emailResponse = await fetch(emailApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(emailPayload),
              });

              console.log('📥 Email API response status:', emailResponse.status);

              if (emailResponse.ok) {
                const emailResult = await emailResponse.json();
                console.log('✅ Email sent successfully!');
                console.log('📧 Email IDs:', {
                  customer: emailResult.customerEmailId,
                  admin: emailResult.adminEmailId
                });
              } else {
                const errorText = await emailResponse.text();
                console.error('❌ Email API error:', errorText);
              }

            } catch (emailError) {
              console.error('❌ Email error:', emailError.message);
              // Email hatası ödeme başarısını etkilemez
            }
          } else {
            console.warn('⚠️ No order data provided, skipping email');
          }

          res.status(200).json({
            status: 'success',
            paymentId: result.paymentId,
            price: result.price,
            paidPrice: result.paidPrice,
            paymentStatus: result.paymentStatus
          });
        } else {
          console.log('❌ Payment failed:', result.errorMessage);
          res.status(400).json({
            status: 'error',
            errorMessage: result.errorMessage || 'Ödeme başarısız',
            paymentStatus: result.paymentStatus
          });
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + error.message
    });
  }
}