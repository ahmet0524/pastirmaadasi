// src/pages/api/create-payment.js

export const POST = async ({ request }) => {
  // ...
};
  try {
    console.log("💳 Ödeme oluşturma isteği alındı");

    // İyzipay'i dinamik import ile yükle
    let Iyzipay;
    try {
      const iyzipayModule = await import("iyzipay");
      Iyzipay = iyzipayModule.default;
      console.log("✅ İyzipay kütüphanesi yüklendi");
    } catch (importError) {
      console.error("❌ İyzipay import hatası:", importError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ödeme modülü yüklenemedi: " + importError.message
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // İyzipay instance oluştur
    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY || "sandbox-iMWOs8liBFXBEw49vXevtfru7ZnPkIDs",
      secretKey: import.meta.env.IYZICO_SECRET_KEY || "sandbox-cUbewaUJPvAzNUUMsXaGzbUzK2gsYudG",
      uri: "https://sandbox-api.iyzipay.com",
    });

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

    const baseUrl = import.meta.env.PUBLIC_SITE_URL || "https://pastirmaadasi.vercel.app";
    const callbackUrl = `${baseUrl}/api/payment-callback`;

    console.log("🔗 Callback URL:", callbackUrl);

    // İyzico request data
    const requestData = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: totalPrice,
      paidPrice: totalPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: Date.now().toString(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: buyer.id || "BY" + Date.now(),
        name: buyer.name,
        surname: buyer.surname,
        gsmNumber: buyer.gsmNumber || "+905555555555",
        email: buyer.email,
        identityNumber: buyer.identityNumber || "11111111111",
        lastLoginDate: "2024-01-01 00:00:00",
        registrationDate: "2024-01-01 00:00:00",
        registrationAddress: buyer.registrationAddress || shippingAddress?.address || "Kayseri, Türkiye",
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || buyer.ip || "85.34.78.112",
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
        id: item.id || `ITEM${index + 1}`,
        name: item.name || "Ürün",
        category1: item.category1 || "Gıda",
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: item.price,
      })),
    };

    console.log("📤 İyzico'ya gönderilecek veri:", JSON.stringify(requestData, null, 2));

    // Promise wrapper for callback-based API
    const result = await new Promise((resolve, reject) => {
      try {
        iyzipay.checkoutFormInitialize.create(requestData, (err, result) => {
          if (err) {
            console.error("❌ İyzico callback hatası:", err);
            reject(err);
          } else {
            console.log("📥 İyzico callback sonucu:", JSON.stringify(result, null, 2));
            resolve(result);
          }
        });
      } catch (createError) {
        console.error("❌ İyzico create hatası:", createError);
        reject(createError);
      }
    });

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
    console.error("Hata tipi:", error.constructor.name);
    console.error("Hata mesajı:", error.message);
    console.error("Stack trace:", error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Sunucu hatası",
        errorType: error.constructor.name,
        details: error.stack,
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