// api/create-payment.cjs
const Iyzipay = require('iyzipay');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
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
    console.log('🔄 Starting payment creation...');

    // Environment variables kontrolü
    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      console.error('❌ Environment variables missing!');
      return res.status(500).json({
        status: 'error',
        errorMessage: 'Server configuration error'
      });
    }

    // Body parsing güvencesi
    let body;
    try {
      body = JSON.parse(req.body || '{}');
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return res.status(400).json({ status: 'error', errorMessage: 'Invalid JSON body' });
    }
    
    console.log('📦 Request body received:', {
      price: body.price,
      paidPrice: body.paidPrice,
      basketId: body.basketId,
      itemCount: body.basketItems?.length
    });

    // Body validation
    if (!body.price || !body.paidPrice || !body.buyer || !body.basketItems) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Eksik ödeme bilgileri'
      });
    }

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    const callbackUrl = `${process.env.SITE_URL || 'https://pastirmaadasi.vercel.app'}/odeme-sonuc`;
    console.log('🔗 Callback URL:', callbackUrl);

    const paymentRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: body.price,
      paidPrice: body.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: body.basketId || 'B' + Date.now(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: body.buyer,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      basketItems: body.basketItems
    };

    console.log('📤 Sending request to Iyzico...');

    return new Promise((resolve) => {
      iyzipay.checkoutFormInitialize.create(paymentRequest, (err, result) => {
        if (err) {
          console.error('❌ Iyzico error:', err);
          res.status(400).json({
            status: 'error',
            errorMessage: err.errorMessage || 'Ödeme başlatılamadı',
            errorCode: err.errorCode
          });
          resolve();
        } else {
          console.log('✅ Iyzico response:', {
            status: result.status,
            hasPaymentPageUrl: !!result.paymentPageUrl,
            token: result.token ? 'exists' : 'missing'
          });

          if (result.status === 'success' && result.paymentPageUrl) {
            console.log('✅ Payment page URL generated');
            res.status(200).json({
              status: 'success',
              paymentPageUrl: result.paymentPageUrl,
              token: result.token
            });
          } else {
            console.error('❌ Invalid Iyzico response:', result);
            res.status(400).json({
              status: 'error',
              errorMessage: result.errorMessage || 'Ödeme sayfası oluşturulamadı',
              iyzicoStatus: result.status
            });
          }
          resolve();
        }
      });
    });

  } catch (error) {
    console.error('❌ Payment error:', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + error.message
    });
  }
};