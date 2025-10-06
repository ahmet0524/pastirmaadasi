// api/verify-payment.cjs
const Iyzipay = require('iyzipay');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // OPTIONS isteği için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sadece POST kabul et
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({
      status: 'error',
      errorMessage: 'Method Not Allowed - Only POST accepted'
    });
  }

  try {
    console.log('🔄 Verifying payment...');

    // Body parsing
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('❌ Invalid JSON body:', e);
        return res.status(400).json({
          status: 'error',
          errorMessage: 'Geçersiz istek formatı'
        });
      }
    }

    const { token } = body;

    console.log('📦 Received token:', token ? 'exists' : 'missing');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Token bulunamadı. Lütfen ödeme işlemini yeniden başlatın.'
      });
    }

    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      console.error('❌ Environment variables missing!');
      return res.status(500).json({
        status: 'error',
        errorMessage: 'Sunucu yapılandırma hatası. Lütfen site yöneticisiyle iletişime geçin.'
      });
    }

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    console.log('📤 Calling Iyzico retrieve API with token:', token);

    return new Promise((resolve) => {
      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: Date.now().toString(),
        token: token
      }, (err, result) => {
        if (err) {
          console.error('❌ Iyzico retrieve error (full):', JSON.stringify(err, null, 2));

          // Hata mesajını düzgün çıkar
          let errorMessage = 'Doğrulama başarısız';

          if (err.errorMessage) {
            errorMessage = err.errorMessage;
          } else if (err.message) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }

          res.status(400).json({
            status: 'error',
            errorMessage: errorMessage,
            errorCode: err.errorCode || 'UNKNOWN'
          });
          resolve();
        } else {
          console.log('✅ Iyzico result (full):', JSON.stringify(result, null, 2));

          if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
            console.log('✅ Payment verified successfully');
            res.status(200).json({
              status: 'success',
              paymentId: result.paymentId,
              price: result.price,
              paidPrice: result.paidPrice,
              paymentStatus: result.paymentStatus
            });
          } else {
            console.log('⚠️ Payment not successful:', result.paymentStatus);

            let errorMessage = 'Ödeme başarısız';
            if (result.errorMessage) {
              errorMessage = result.errorMessage;
            }

            res.status(400).json({
              status: 'error',
              errorMessage: errorMessage,
              paymentStatus: result.paymentStatus
            });
          }
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ Verification error (full):', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen hata')
    });
  }
};