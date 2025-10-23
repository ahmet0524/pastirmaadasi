import crypto from 'crypto';

export const prerender = false;

function generateIyzicoSignature(apiKey, secretKey, randomString, requestBody) {
  const requestString = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
  const dataToHash = `${randomString}${requestString}`;
  const hash = crypto.createHmac('sha1', secretKey).update(dataToHash, 'utf8').digest('base64');
  const authString = `${apiKey}:${randomString}:${hash}`;
  return Buffer.from(authString, 'utf8').toString('base64');
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { items, buyer, shippingAddress, billingAddress } = body;

    if (!items?.length || !buyer?.email) {
      return new Response(JSON.stringify({ success: false, error: 'Eksik veri gönderildi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = import.meta.env.IYZICO_API_KEY;
    const secretKey = import.meta.env.IYZICO_SECRET_KEY;

    const baseUrl =
      import.meta.env.PUBLIC_SITE_URL ||
      (import.meta.env.PROD ? 'https://pastirmaadasi.vercel.app' : 'http://localhost:4321');

    const callbackUrl = `${baseUrl}/api/payment-callback`;

    const totalPrice = items.reduce((s, i) => s + parseFloat(i.price || 0), 0);
    const conversationId = Date.now().toString();

    const requestBody = {
      locale: 'tr',
      conversationId,
      price: totalPrice.toFixed(2),
      paidPrice: totalPrice.toFixed(2),
      currency: 'TRY',
      basketId: `BASKET_${conversationId}`,
      paymentGroup: 'PRODUCT',
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer,
      shippingAddress,
      billingAddress,
      basketItems: items.map((item, i) => ({
        id: item.id || `ITEM_${i + 1}`,
        name: item.name,
        category1: item.category1 || 'Gıda',
        itemType: 'PHYSICAL',
        price: parseFloat(item.price).toFixed(2),
      })),
    };

    const randomString = crypto.randomBytes(16).toString('hex');
    const authorization = generateIyzicoSignature(apiKey, secretKey, randomString, requestBody);

    const response = await fetch(
      'https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `IYZWS ${apiKey}:${authorization}`,
          'x-iyzi-rnd': randomString,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const result = await response.json();
    if (result.status === 'success' && result.paymentPageUrl) {
      return new Response(
        JSON.stringify({ success: true, paymentPageUrl: result.paymentPageUrl, token: result.token }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: result.errorMessage || 'Ödeme oluşturulamadı' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
