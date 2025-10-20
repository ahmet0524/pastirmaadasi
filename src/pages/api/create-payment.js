// src/pages/api/create-payment.js

import Iyzipay from 'iyzipay';

export async function POST({ request }) {
  try {
    const { items, buyer, shippingAddress, billingAddress } = await request.json();

    console.log('💳 Ödeme oluşturma isteği alındı');

    // Iyzico yapılandırması
    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com',
    });

    // Toplam tutarı hesapla
    const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2);

    // ÖNEMLI: Callback URL'leri
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || 
                    (import.meta.env.PROD 
                      ? 'https://pastirmaadasi.vercel.app' 
                      : 'http://localhost:4321');

    const callbackUrl = `${baseUrl}/api/payment-callback`;

    console.log('🔗 Callback URL:', callbackUrl);

    const request_data = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: totalPrice,
      paidPrice: totalPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: Date.now().toString(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: callbackUrl, // İyzico buraya POST yapacak
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: buyer.id || 'BY' + Date.now(),
        name: buyer.name,
        surname: buyer.surname,
        gsmNumber: buyer.gsmNumber,
        email: buyer.email,
        identityNumber: buyer.identityNumber || '11111111111',
        registrationAddress: buyer.registrationAddress || shippingAddress.address,
        ip: buyer.ip || '85.34.78.112',
        city: buyer.city || shippingAddress.city,
        country: buyer.country || 'Turkey',
      },
      shippingAddress: {
        contactName: shippingAddress.contactName,
        city: shippingAddress.city,
        country: shippingAddress.country || 'Turkey',
        address: shippingAddress.address,
      },
      billingAddress: {
        contactName: billingAddress.contactName,
        city: billingAddress.city,
        country: billingAddress.country || 'Turkey',
        address: billingAddress.address,
      },
      basketItems: items.map((item, index) => ({
        id: item.id || `item_${index}`,
        name: item.name,
        category1: item.category1 || 'Gıda',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: item.price,
      })),
    };

    console.log('📦 İyzico request data:', {
      ...request_data,
      callbackUrl,
      itemCount: items.length
    });

    // Checkout form oluştur
    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(request_data, (err, result) => {
        if (err) {
          console.error('❌ İyzico hatası:', err);
          reject(err);
        } else {
          console.log('✅ Checkout form oluşturuldu:', {
            status: result.status,
            token: result.token,
            paymentPageUrl: result.paymentPageUrl
          });
          resolve(result);
        }
      });
    });

    if (result.status === 'success') {
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
      console.error('❌ İyzico başarısız:', result);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.errorMessage || 'Ödeme oluşturulamadı',
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('💥 Sunucu hatası:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Sunucu hatası',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}