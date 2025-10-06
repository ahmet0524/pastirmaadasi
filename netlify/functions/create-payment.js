const Iyzipay = require('iyzipay');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS isteği için
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Environment variables kontrolü
    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      console.error('Environment variables missing!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Server configuration error',
          details: 'API keys not configured'
        })
      };
    }

    console.log('Parsing request body...');
    const body = JSON.parse(event.body);
    console.log('Body parsed successfully');

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
      callbackUrl: `https://pastirmaadasi.netlify.app/odeme-sonuc`,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: body.buyer,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      basketItems: body.basketItems
    };

    return new Promise((resolve) => {
      iyzipay.checkoutFormInitialize.create(paymentRequest, (err, result) => {
        resolve({
          statusCode: err ? 400 : 200,
          headers,
          body: JSON.stringify(err || result)
        });
      });
    });
  } catch (error) {
    console.error('Payment error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};