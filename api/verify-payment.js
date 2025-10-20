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

    console.log('📦 Order data received:', JSON.stringify(orderData, null, 2));

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

        console.log('✅ Iyzico result:', {
          status: result.status,
          paymentStatus: result.paymentStatus,
          paymentId: result.paymentId
        });

        if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
          console.log('💰 Payment successful! Preparing email...');

          // Ödeme başarılı - Email gönder
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

              console.log('📧 Email payload prepared:', JSON.stringify(emailPayload, null, 2));

              // ✅ DÜZELTME: HTTP fetch ile email API'sini çağır
              const emailApiUrl = process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}/api/send-order-email`
                : 'http://localhost:3000/api/send-order-email';

              console.log('📤 Sending request to:', emailApiUrl);

              const emailResponse = await fetch(emailApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(emailPayload)
              });

              console.log('📥 Email API response status:', emailResponse.status);

              const emailResult = await emailResponse.json();
              console.log('📧 Email API response:', JSON.stringify(emailResult, null, 2));

              if (emailResult.status === 'success') {
                console.log('✅ Email sent successfully!');
              } else {
                console.error('❌ Email sending failed:', emailResult.errorMessage);
              }

            } catch (emailError) {
              console.error('❌ Email error:', emailError.message);
              console.error('🔍 Email error stack:', emailError.stack);
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
    console.error('🔍 Error stack:', error.stack);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + error.message
    });
  }
}