import Iyzipay from 'iyzipay';

export async function POST({ request }) {
  try {
    const body = await request.json();

    console.log('💳 Ödeme oluşturma isteği alındı');
    console.log('📧 Gelen buyer verisi:', {
      name: body.buyer?.name,
      surname: body.buyer?.surname,
      email: body.buyer?.email,  // EMAIL KONTROLÜ
    });

    // Environment variable kontrolü
    if (!import.meta.env.IYZICO_API_KEY || !import.meta.env.IYZICO_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: 'Sunucu yapılandırma hatası',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

    const baseUrl = import.meta.env.SITE_URL || 'https://pastirmaadasi.vercel.app';
    const callbackUrl = `${baseUrl}/api/payment-callback`;

    console.log('🔗 Callback URL:', callbackUrl);

    // ⚠️ ÖNEMLİ: Buyer email kontrolü
    if (!body.buyer?.email) {
      console.error('❌ BUYER EMAIL EKSİK!');
      return new Response(
        JSON.stringify({
          status: 'error',
          errorMessage: 'Email adresi gereklidir',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paymentRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: body.price,
      paidPrice: body.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: body.basketId || 'B' + Date.now(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: body.buyer.id || 'BY' + Date.now(),
        name: body.buyer.name,
        surname: body.buyer.surname,
        gsmNumber: body.buyer.gsmNumber || '+905555555555',
        email: body.buyer.email,  // ⚠️ EMAIL MUTLAKA GÖNDERİLMELİ
        identityNumber: body.buyer.identityNumber || '11111111111',
        registrationAddress: body.buyer.registrationAddress || body.shippingAddress?.address,
        ip: body.buyer.ip || '85.34.78.112',
        city: body.buyer.city || body.shippingAddress?.city,
        country: body.buyer.country || 'Turkey',
      },
      shippingAddress: {
        contactName: body.shippingAddress.contactName,
        city: body.shippingAddress.city,
        country: body.shippingAddress.country || 'Turkey',
        address: body.shippingAddress.address,
      },
      billingAddress: {
        contactName: body.billingAddress.contactName,
        city: body.billingAddress.city,
        country: body.billingAddress.country || 'Turkey',
        address: body.billingAddress.address,
      },
      basketItems: body.basketItems.map((item, index) => ({
        id: item.id || `item_${index}`,
        name: item.name,
        category1: item.category1 || 'Gıda',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: item.price,
      })),
    };

    console.log('📦 İyzico\'ya gönderilen buyer:', paymentRequest.buyer);

    return new Promise((resolve) => {
      iyzipay.checkoutFormInitialize.create(paymentRequest, (err, result) => {
        if (err) {
          console.error('❌ İyzico hatası:', err);
          resolve(
            new Response(
              JSON.stringify({
                status: 'error',
                errorMessage: err.errorMessage || err.message || 'Ödeme başlatılamadı',
                errorCode: err.errorCode || 'UNKNOWN',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          );
        } else if (result.status === 'success' && result.paymentPageUrl) {
          console.log('✅ Ödeme sayfası oluşturuldu:', result.paymentPageUrl);
          resolve(
            new Response(
              JSON.stringify({
                status: 'success',
                paymentPageUrl: result.paymentPageUrl,
                token: result.token,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        } else {
          console.error('❌ İyzico başarısız:', result);
          resolve(
            new Response(
              JSON.stringify({
                status: 'error',
                errorMessage: result.errorMessage || 'Ödeme sayfası oluşturulamadı',
                iyzicoStatus: result.status,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error('💥 Sunucu hatası:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        errorMessage: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen hata'),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', message: 'Create Payment API aktif' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}