// api/create-payment.js
import Iyzipay from 'iyzipay';

export default async function handler(req, res) {
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
        errorMessage: 'Sunucu yapılandırma hatası. Lütfen site yöneticisiyle iletişime geçin.'
      });
    }

    // Vercel otomatik parse eder, ama güvenlik için kontrol
    const body = req.body;

    console.log('📦 Request body received:', {
      price: body.price,
      paidPrice: body.paidPrice,
      basketId: body.basketId,
      itemCount: body.basketItems?.length,
      buyer: body.buyer ? 'exists' : 'missing',
      shippingAddress: body.shippingAddress ? 'exists' : 'missing',
      billingAddress: body.billingAddress ? 'exists' : 'missing'
    });

    // Body validation
    if (!body.price || !body.paidPrice || !body.buyer || !body.basketItems) {
      console.error('❌ Missing required fields:', {
        hasPrice: !!body.price,
        hasPaidPrice: !!body.paidPrice,
        hasBuyer: !!body.buyer,
        hasBasketItems: !!body.basketItems
      });
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Eksik ödeme bilgileri. Lütfen tüm alanları doldurun.'
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
          console.error('❌ Iyzico error (full):', JSON.stringify(err, null, 2));

          // Hata mesajını düzgün çıkar
          let errorMessage = 'Ödeme başlatılamadı';

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
            errorCode: err.errorCode || 'UNKNOWN',
            errorGroup: err.errorGroup || 'UNKNOWN'
          });
          resolve();
        } else {
          console.log('✅ Iyzico response (full):', JSON.stringify(result, null, 2));

          if (result.status === 'success' && result.paymentPageUrl) {
            console.log('✅ Payment page URL generated successfully');
            res.status(200).json({
              status: 'success',
              paymentPageUrl: result.paymentPageUrl,
              token: result.token
            });
          } else {
            console.error('❌ Invalid Iyzico response:', result);

            let errorMessage = 'Ödeme sayfası oluşturulamadı';
            if (result.errorMessage) {
              errorMessage = result.errorMessage;
            }

            res.status(400).json({
              status: 'error',
              errorMessage: errorMessage,
              iyzicoStatus: result.status,
              errorCode: result.errorCode || 'UNKNOWN'
            });
          }
          resolve();
        }
      });
    });

  } catch (error) {
    console.error('❌ Payment error (full):', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen hata')
    });
  }
}