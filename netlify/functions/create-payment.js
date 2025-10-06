// api/create-payment.js
const Iyzipay = require('iyzipay');

// Vercel Serverless Function Format
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Environment variables kontrolü
    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      console.error('Environment variables missing!');
      res.status(500).json({
        status: 'error',
        error: 'Server configuration error',
        errorMessage: 'API keys not configured'
      });
      return;
    }

    console.log('Creating payment request...');
    const body = req.body;

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    const paymentRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: body.price,
      paidPrice: body.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: body.basketId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: `${process.env.SITE_URL || 'https://pastirmaadasi.vercel.app'}/odeme-sonuc`,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: body.buyer,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      basketItems: body.basketItems
    };

    console.log('Calling Iyzico API...');

    iyzipay.checkoutFormInitialize.create(paymentRequest, (err, result) => {
      if (err) {
        console.error('Iyzico error:', err);
        res.status(400).json({
          status: 'error',
          error: err.errorMessage || 'Payment initialization failed',
          errorMessage: err.errorMessage
        });
      } else {
        console.log('Iyzico response status:', result.status);
        if (result.status === 'success' && result.paymentPageUrl) {
          res.status(200).json({
            status: 'success',
            paymentPageUrl: result.paymentPageUrl,
            token: result.token
          });
        } else {
          res.status(400).json({
            status: 'error',
            error: result.errorMessage || 'Payment page URL not generated',
            errorMessage: result.errorMessage
          });
        }
      }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      errorMessage: 'Sunucu hatası'
    });
  }
};