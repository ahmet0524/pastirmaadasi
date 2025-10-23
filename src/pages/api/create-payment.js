// src/pages/api/create-payment.js
import crypto from 'crypto';

// İyzipay imza oluşturma fonksiyonu
function generateAuthorizationString(apiKey, secretKey, randomString, requestBody) {
  const dataToHash = randomString + JSON.stringify(requestBody);
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataToHash)
    .digest('base64');

  return `IYZWS ${apiKey}:${hash}`;
}

export async function POST({ request }) {
  try {
    console.log("💳 Ödeme oluşturma isteği alındı");

    // Request body'yi parse et
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("❌ JSON parse hatası:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Geçersiz JSON formatı" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { items, buyer, shippingAddress, billingAddress } = body;

    console.log("📦 Gelen veri:", {
      itemCount: items?.length,
      buyerEmail: buyer?.email,
      buyerName: buyer?.name,
    });

    // Validasyon
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ Sepet boş veya geçersiz");
      return new Response(
        JSON.stringify({ success: false, error: "Sepet boş." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!buyer || !buyer.email || !buyer.name || !buyer.surname) {
      console.error("❌ Eksik müşteri bilgileri");
      return new Response(
        JSON.stringify({ success: false, error: "Müşteri bilgileri eksik." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Toplam fiyat hesapla
    const totalPrice = items
      .reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
      .toFixed(2);

    console.log("💰 Toplam fiyat:", totalPrice);

    // API bilgileri
    const apiKey = import.meta.env.IYZICO_API_KEY || "sandbox-iMWOs8liBFXBEw49vXevtfru7ZnPkIDs";
    const secretKey = import.meta.env.IYZICO_SECRET_KEY || "sandbox-cUbewaUJPvAzNUUMsXaGzbUzK2gsYudG";
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || "https://pastirmaadasi.vercel.app";
    const callbackUrl = `${baseUrl}/api/payment-callback`;

    console.log("🔗 Callback URL:", callbackUrl);

    // İyzico için request data oluştur
    const requestData = {
      locale: "tr",
      conversationId: Date.now().toString(),
      price: totalPrice,
      paidPrice: totalPrice,
      currency: "TRY",
      basketId: Date.now().toString(),
      paymentGroup: "PRODUCT",
      callbackUrl: callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: buyer.id || "BY" + Date.now(),
        name: buyer.name,
        surname: buyer.surname,
        gsmNumber: buyer.gsmNumber || "+905555555555",
        email: buyer.email,
        identityNumber: buyer.identityNumber || "11111111111",
        registrationAddress: buyer.registrationAddress || shippingAddress?.address || "Kayseri, Türkiye",
        ip: buyer.ip || "85.34.78.112",
        city: buyer.city || shippingAddress?.city || "Kayseri",
        country: buyer.country || "Turkey",
        zipCode: buyer.zipCode || "38000",
      },
      shippingAddress: {
        contactName: shippingAddress?.contactName || `${buyer.name} ${buyer.surname}`,
        city: shippingAddress?.city || "Kayseri",
        country: shippingAddress?.country || "Turkey",
        address: shippingAddress?.address || "Kayseri, Türkiye",
        zipCode: shippingAddress?.zipCode || "38000",
      },
      billingAddress: {
        contactName: billingAddress?.contactName || `${buyer.name} ${buyer.surname}`,
        city: billingAddress?.city || "Kayseri",
        country: billingAddress?.country || "Turkey",
        address: billingAddress?.address || "Kayseri, Türkiye",
        zipCode: billingAddress?.zipCode || "38000",
      },
      basketItems: items.map((item, index) => ({
        id: item.id || `item_${index + 1}`,
        name: item.name || "Ürün",
        category1: item.category1 || "Gıda",
        itemType: "PHYSICAL",
        price: item.price,
      })),
    };

    console.log("📤 İyzico'ya gönderilecek veri:", JSON.stringify(requestData, null, 2));

    // Random string ve authorization oluştur
    const randomString = crypto.randomBytes(16).toString('hex');
    const authorization = generateAuthorizationString(apiKey, secretKey, randomString, requestData);

    console.log("🔐 Authorization hazırlandı");

    // İyzico API'ye istek at
    const iyzicoResponse = await fetch(
      "https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authorization,
          "x-iyzi-rnd": randomString,
        },
        body: JSON.stringify(requestData),
      }
    );

    console.log("📥 İyzico response status:", iyzicoResponse.status);

    const result = await iyzicoResponse.json();
    console.log("📥 İyzico yanıtı:", JSON.stringify(result, null, 2));

    if (result.status === "success") {
      console.log("✅ Ödeme başarıyla oluşturuldu:", result.paymentPageUrl);
      return new Response(
        JSON.stringify({
          success: true,
          paymentPageUrl: result.paymentPageUrl,
          token: result.token,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } else {
      console.error("❌ İyzico hatası:", result.errorMessage || result.errorCode);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.errorMessage || "Ödeme oluşturulamadı",
          errorCode: result.errorCode,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("💥 Sunucu hatası:", error);
    console.error("Stack trace:", error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Sunucu hatası",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// OPTIONS endpoint for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}