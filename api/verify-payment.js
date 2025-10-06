// api/verify-payment.js
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
    console.log('Invalid method:', req.method);
    return res.status(405).json({ 
      status: 'error',
      errorMessage: 'Method Not Allowed - Only POST accepted' 
    });
  }

  try {
    console.log('Verifying payment...');
    const { token } = req.body;

    if (!token) {
      console.log('No token provided');
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Token bulunamadı'
      });
    }

    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      console.error('Environment variables missing');
      return res.status(500).json({
        status: 'error',
        errorMessage: 'Server configuration error'
      });
    }

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    console.log('Calling Iyzico retrieve API with token:', token);

    return new Promise((resolve) => {
      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: Date.now().toString(),
        token: token
      }, (err, result) => {
        if (err) {
          console.error('Iyzico retrieve error:', err);
          res.status(400).json({
            status: 'error',
            errorMessage: err.errorMessage || 'Doğrulama başarısız'
          });
        } else {
          console.log('Iyzico result:', {
            status: result.status,
            paymentStatus: result.paymentStatus
          });

          if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
            res.status(200).json({
              status: 'success',
              paymentId: result.paymentId,
              price: result.price,
              paidPrice: result.paidPrice,
              paymentStatus: result.paymentStatus
            });
          } else {
            res.status(400).json({
              status: 'error',
              errorMessage: result.errorMessage || 'Ödeme başarısız',
              paymentStatus: result.paymentStatus
            });
          }
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + error.message
    });
  }
};