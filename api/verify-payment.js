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

              // ✅ DÜZELTİLDİ: Absolute URL ile fetch
              const protocol = req.headers['x-forwarded-proto'] || 'https';
              const host = req.headers['x-forwarded-host'] || req.headers.host;
              const emailApiUrl = `${protocol}://${host}/api/send-order-email`;

              console.log('📤 Email API URL:', emailApiUrl);
              console.log('📤 Protocol:', protocol);
              console.log('📤 Host:', host);

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye timeout

              const emailResponse = await fetch(emailApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(emailPayload),
                signal: controller.signal
              }).finally(() => clearTimeout(timeoutId));

              console.log('📥 Email API response status:', emailResponse.status);

              const responseText = await emailResponse.text();
              console.log('📄 Email API response text:', responseText);

              let emailResult;
              try {
                emailResult = JSON.parse(responseText);
                console.log('📧 Email API response:', JSON.stringify(emailResult, null, 2));
              } catch (parseError) {
                console.error('❌ Failed to parse email response:', parseError);
                console.error('📄 Raw response:', responseText);
                throw new Error('Invalid JSON response from email API');
              }

              if (emailResult.status === 'success') {
                console.log('✅ Email sent successfully!');
                console.log('📧 Customer Email ID:', emailResult.customerEmailId);
                console.log('📧 Admin Email ID:', emailResult.adminEmailId);
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