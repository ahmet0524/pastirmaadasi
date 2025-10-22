import Iyzipay from 'iyzipay';

export async function POST({ request }) {
  try {
    console.log('💳 Ödeme isteği alındı');

    const body = await request.json();
    const { basketItems, buyer, shippingAddress, billingAddress } = body;

    if (!Array.isArray(basketItems) || basketItems.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Sepet boş veya ürünler eksik.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const name = buyer?.name || 'Müşteri';
    const surname = buyer?.surname || '';
    const email = buyer?.email || '';
    if (!email.includes('@')) {
      return new Response(JSON.stringify({ success: false, error: 'Geçersiz e-posta adresi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 🔧 Iyzico ayarları
    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

    // 🔹 Tutar hesaplaması
    const totalPrice = basketItems
      .reduce((sum, item) => sum + Number(item.price || 0), 0)
      .toFixed(2);

    // 🔹 Callback URL
    const baseUrl =
      import.meta.env.PUBLIC_SITE_URL ||
      (import.meta.env.PROD ? 'https://pastirmaadasi.vercel.app' : 'http://localhost:4321');
    const callbackUrl = `${baseUrl}/api/payment-callback`;

    // 🔹 Iyzico veri yapısı
    const requestData = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: totalPrice, // ana fiyat
      paidPrice: totalPrice, // toplam ödenen fiyat
      currency: Iyzipay.CURRENCY.TRY,
      basketId: 'BASKET_' + Date.now(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],

      buyer: {
        id: 'BY_' + Date.now(),
        name,
        surname,
        email,
        identityNumber: '11111111111',
        registrationAddress:
          buyer?.address || shippingAddress?.address || 'Kayseri, Türkiye',
        ip: buyer?.ip || '85.34.78.112',
        city: buyer?.city || shippingAddress?.city || 'Kayseri',
        country: buyer?.country || 'Turkey',
      },

      shippingAddress: {
        contactName: `${name} ${surname}`,
        city: shippingAddress?.city || 'Kayseri',
        country: shippingAddress?.country || 'Turkey',
        address: shippingAddress?.address || 'Kayseri, Türkiye',
      },

      billingAddress: {
        contactName: `${name} ${surname}`,
        city: billingAddress?.city || 'Kayseri',
        country: billingAddress?.country || 'Turkey',
        address: billingAddress?.address || 'Kayseri, Türkiye',
      },

      basketItems: basketItems.map((item, i) => ({
        id: item.id || `ITEM_${i + 1}`,
        name: item.name || 'Ürün',
        category1: item.category1 || 'Et Ürünü',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: Number(item.price || 0).toFixed(2), // 🔧 düzeltme: string ama 2 haneli
      })),
    };

    console.log('📦 Gönderilen veri:', {
      buyerEmail: email,
      totalPrice,
      itemCount: basketItems.length,
    });

    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(requestData, (err, result) => {
        if (err) {
          console.error('❌ İyzico hata:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    if (result.status === 'success') {
      console.log('✅ Iyzico ödeme sayfası oluşturuldu:', result.paymentPageUrl);
      return new Response(
        JSON.stringify({
          status: 'success',
          success: true,
          paymentPageUrl: result.paymentPageUrl,
          token: result.token,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('❌ İyzico başarısız:', result.errorMessage);
      return new Response(
        JSON.stringify({
          status: 'error',
          success: false,
          error: result.errorMessage || 'Ödeme oluşturulamadı',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('💥 Sunucu hatası:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        success: false,
        error: error.message || 'Sunucu hatası',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
