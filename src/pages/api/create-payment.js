// src/pages/api/create-payment.js
import crypto from 'crypto';

// İyzipay için imza oluşturma fonksiyonu
function generateSignature(apiKey, secretKey, randomString, request) {
  const dataString = [
    randomString,
    apiKey,
    ...Object.keys(request)
      .sort()
      .map(key => `${key}=${request[key]}`)
  ].join('');

  return crypto
    .createHmac('sha256', secretKey)
    .update(dataString)
    .digest('base64');
}

export async function POST({ request }) {
  try {
    console.log("💳 Ödeme oluşturma isteği alındı");
    const { items, buyer, shippingAddress, billingAddress } = await request.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Sepet boş." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const totalPrice = items
      .reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
      .toFixed(2);

    const apiKey = import.meta.env.IYZICO_API_KEY || "sandbox-iMWOs8liBFXBEw49vXevtfru7ZnPkIDs";
    const secretKey = import.meta.env.IYZICO_SECRET_KEY || "sandbox-cUbewaUJPvAzNUUMsXaGzbUzK2gsYudG";
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || "https://pastirmaadasi.vercel.app";
    const callbackUrl = `${baseUrl}/api/payment-callback`;

    const requestData = {
      locale: 'tr',
      conversationId: Date.now().toString(),
      price: totalPrice,
      paidPrice: totalPrice,
      currency: 'TRY',
      basketId: Date.now().toString(),
      paymentGroup: 'PRODUCT',
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: buyer?.id || "BY" + Date.now(),
        name: buyer?.name || "Müşteri",
        surname: buyer?.surname || "Test",
        gsmNumber: buyer?.gsmNumber || "+905555555555",
        email: buyer?.email || "test@example.com",
        identityNumber: buyer?.identityNumber || "11111111111",
        registrationAddress: buyer?.registrationAddress || shippingAddress?.address || "Kayseri, Türkiye",
        ip: request.headers.get('x-forwarded-for') || "85.34.78.112",
        city: buyer?.city || shippingAddress?.city || "Kayseri",
        country: buyer?.country || "Turkey",
      },
      shippingAddress: {
        contactName: shippingAddress?.contactName || `${buyer?.name || 'Müşteri'} ${buyer?.surname || 'Test'}`,
        city: shippingAddress?.city || "Kayseri",
        country: shippingAddress?.country || "Turkey",
        address: shippingAddress?.address || "Kayseri, Türkiye",
      },
      billingAddress: {
        contactName: billingAddress?.contactName || `${buyer?.name || 'Müşteri'} ${buyer?.surname || 'Test'}`,
        city: billingAddress?.city || "Kayseri",
        country: billingAddress?.country || "Turkey",
        address: billingAddress?.address || "Kayseri, Türkiye",
      },
      basketItems: items.map((item, index) => ({
        id: item.id || `item_${index + 1}`,
        name: item.name || "Ürün",
        category1: item.category1 || "Gıda",
        itemType: 'PHYSICAL',
        price: Number(item.price || 0).toFixed(2),
      })),
    };

    const randomString = crypto.randomBytes(16).toString('hex');
    const signature = generateSignature(apiKey, secretKey, randomString, requestData);

    console.log("📦 İyzico'ya istek gönderiliyor...");

    const response = await fetch('https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `IYZWSv2 ${apiKey}:${signature}:${randomString}`,
        'x-iyzi-rnd': randomString,
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();
    console.log("📥 İyzico yanıtı:", result);

    if (result.status === "success") {
      return new Response(
        JSON.stringify({
          success: true,
          paymentPageUrl: result.paymentPageUrl,
          token: result.token,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.errorMessage || "Ödeme oluşturulamadı",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("💥 Sunucu hatası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Sunucu hatası",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}