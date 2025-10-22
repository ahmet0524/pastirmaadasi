// src/pages/api/create-payment.js
import Iyzipay from 'iyzipay';

export const prerender = false;

export async function POST({ request }) {
  console.log('🚀 ========== ÖDEME İSTEĞİ BAŞLADI ==========');

  try {
    const body = await request.json();
    console.log('📨 Gelen body:', JSON.stringify(body, null, 2));

    const { items, buyer, shippingAddress, billingAddress } = body;

    // Validasyon
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Items array geçersiz:', items);
      return new Response(JSON.stringify({
        success: false,
        error: 'Sepet boş veya geçersiz'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!buyer || !buyer.email || !buyer.name) {
      console.error('❌ Buyer bilgileri eksik:', buyer);
      return new Response(JSON.stringify({
        success: false,
        error: 'Müşteri bilgileri eksik'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // İyzico başlat
    console.log('🔧 İyzico başlatılıyor...');
    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

    // Toplam hesapla
    const totalPrice = items.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      console.log(`  📊 Item: ${item.name} = ${price}₺`);
      return sum + price;
    }, 0);

    console.log('💰 Toplam tutar:', totalPrice.toFixed(2));

    if (totalPrice <= 0 || isNaN(totalPrice)) {
      console.error('❌ Geçersiz toplam:', totalPrice);
      return new Response(JSON.stringify({
        success: false,
        error: 'Geçersiz sepet tutarı'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // URL'leri hazırla
    const baseUrl = import.meta.env.PUBLIC_SITE_URL ||
                    (import.meta.env.PROD
                      ? 'https://pastirmaadasi.vercel.app'
                      : 'http://localhost:4321');

    const callbackUrl = `${baseUrl}/api/payment-callback`;
    console.log('🔗 Callback URL:', callbackUrl);

    // Request data hazırla
    const conversationId = Date.now().toString();
    const basketId = `BASKET_${conversationId}`;

    const request_data = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: totalPrice.toFixed(2),
      paidPrice: totalPrice.toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      basketId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: 'BY' + Date.now(),
        name: buyer.name || 'Müşteri',
        surname: buyer.surname || '',
        gsmNumber: buyer.gsmNumber || '+905555555555',
        email: buyer.email,
        identityNumber: buyer.identityNumber || '11111111111',
        registrationAddress: shippingAddress?.address || 'Kayseri, Türkiye',
        ip: buyer.ip || '85.34.78.112',
        city: buyer.city || shippingAddress?.city || 'Kayseri',
        country: buyer.country || 'Turkey',
      },
      shippingAddress: {
        contactName: shippingAddress?.contactName || `${buyer.name} ${buyer.surname}`,
        city: shippingAddress?.city || 'Kayseri',
        country: shippingAddress?.country || 'Turkey',
        address: shippingAddress?.address || 'Kayseri, Türkiye',
      },
      billingAddress: {
        contactName: billingAddress?.contactName || `${buyer.name} ${buyer.surname}`,
        city: billingAddress?.city || 'Kayseri',
        country: billingAddress?.country || 'Turkey',
        address: billingAddress?.address || 'Kayseri, Türkiye',
      },
      basketItems: items.map((item, index) => ({
        id: item.id || `ITEM_${index + 1}`,
        name: item.name || 'Ürün',
        category1: item.category1 || 'Gıda',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: parseFloat(item.price || 0).toFixed(2),
      })),
    };

    console.log('📤 İyzico\'ya gönderiliyor:', {
      email: request_data.buyer.email,
      price: request_data.price,
      basketId: request_data.basketId,
      itemCount: request_data.basketItems.length
    });

    // İyzico API çağrısı
    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(request_data, (err, result) => {
        if (err) {
          console.error('❌ İyzico hatası:', err);
          reject(err);
        } else {
          console.log('📥 İyzico yanıtı:', {
            status: result.status,
            token: result.token,
            hasPaymentPageUrl: !!result.paymentPageUrl
          });
          resolve(result);
        }
      });
    });

    if (result.status === 'success' && result.paymentPageUrl) {
      console.log('✅ Ödeme sayfası oluşturuldu:', result.paymentPageUrl);
      return new Response(
        JSON.stringify({
          success: true,
          paymentPageUrl: result.paymentPageUrl,
          token: result.token,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('❌ İyzico başarısız:', result.errorMessage || result.errorCode);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.errorMessage || 'Ödeme oluşturulamadı',
          errorCode: result.errorCode,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('💥 FATAL ERROR:', error);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Sunucu hatası',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}