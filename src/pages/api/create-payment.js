// src/pages/api/create-payment.js
import Iyzipay from "iyzipay";

// API key'lerinizi .env dosyasından çekmeniz daha güvenlidir
// const iyzipay = new Iyzipay({
//   apiKey: import.meta.env.IYZICO_API_KEY,
//   secretKey: import.meta.env.IYZICO_SECRET_KEY,
//   uri: "https://sandbox-api.iyzipay.com",
// });

// VEYA dosyanızdaki gibi doğrudan kullanın (güvenlik açısından önerilmez)
const iyzipay = new Iyzipay({
  [cite_start]apiKey: "sandbox-iMWOs8liBFXBEw49vXevtfru7ZnPkIDs", // [cite: 6966]
  [cite_start]secretKey: "sandbox-cUbewaUJPvAzNUUMsXaGzbUzK2gsYudG", // [cite: 6967]
  [cite_start]uri: "https://sandbox-api.iyzipay.com", // [cite: 6968]
});

export async function POST({ request }) {
  try {
    console.log("💳 Ödeme oluşturma isteği alındı");
    const { items, buyer, shippingAddress, billingAddress } = await request.json(); [cite_start]// [cite: 6946-6949]

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Sepet boş." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const totalPrice = items
      .reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
      .toFixed(2); [cite_start]// [cite: 6969-6974]

    // process.env.PUBLIC_SITE_URL kullanmak daha iyidir
    const baseUrl = "https://pastirmaadasi.vercel.app/"; [cite_start]// [cite: 6976]
    const callbackUrl = `${baseUrl}/api/payment-callback`; [cite_start]// [cite: 6977-6978]
    console.log("🔗 Callback URL:", callbackUrl);

    const request_data = {
      [cite_start]locale: Iyzipay.LOCALE.TR, // [cite: 6983]
      [cite_start]conversationId: Date.now().toString(), // [cite: 6984]
      [cite_start]price: totalPrice, // [cite: 6985]
      [cite_start]paidPrice: totalPrice, // [cite: 6986]
      [cite_start]currency: Iyzipay.CURRENCY.TRY, // [cite: 6987]
      [cite_start]basketId: Date.now().toString(), // [cite: 6988]
      [cite_start]paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT, // [cite: 6989]
      [cite_start]callbackUrl, // [cite: 6990]
      [cite_start]enabledInstallments: [1, 2, 3, 6, 9, 12], // [cite: 6990-6993]
      buyer: {
        id: buyer?.id || [cite_start]"BY" + Date.now(), // [cite: 6995-6997]
        name: buyer?.name || [cite_start]"Müşteri", // [cite: 6998-6999]
        surname: buyer?.surname || [cite_start]"", // [cite: 7000-7001]
        gsmNumber: buyer?.gsmNumber || [cite_start]"+905555555555", // [cite: 7002-7003]
        email: buyer?.email || [cite_start]"test@example.com", // [cite: 7004-7005]
        identityNumber: buyer?.identityNumber || [cite_start]"11111111111", // [cite: 7006-7007]
        registrationAddress:
          buyer?.registrationAddress ||
          shippingAddress?.address ||
          [cite_start]"Kayseri, Türkiye", // [cite: 7008-7011]
        ip: buyer?.ip || [cite_start]"85.34.78.112", // [cite: 7012-7013]
        city: buyer?.city || shippingAddress?.city || [cite_start]"Kayseri", // [cite: 7014-7016]
        country: buyer?.country || [cite_start]"Turkey", // [cite: 7017-7018]
      },
      shippingAddress: {
        contactName:
          shippingAddress?.contactName || [cite_start]`${buyer?.name} ${buyer?.surname}`, // [cite: 7020-7022]
        city: shippingAddress?.city || [cite_start]"Kayseri", // [cite: 7022-7024]
        country: shippingAddress?.country || [cite_start]"Turkey", // [cite: 7025-7026]
        address: shippingAddress?.address || [cite_start]"Kayseri, Türkiye", // [cite: 7027-7028]
      },
      billingAddress: {
        contactName:
          billingAddress?.contactName || [cite_start]`${buyer?.name} ${buyer?.surname}`, // [cite: 7030-7032]
        city: billingAddress?.city || [cite_start]"Kayseri", // [cite: 7033-7034]
        country: billingAddress?.country || [cite_start]"Turkey", // [cite: 7035-7036]
        address: billingAddress?.address || [cite_start]"Kayseri, Türkiye", // [cite: 7037-7039]
      },
      basketItems: items.map((item, index) => ({
        [cite_start]id: item.id || `item_${index + 1}`, // [cite: 7042-7045]
        name: item.name || [cite_start]"Ürün", // [cite: 7046-7047]
        category1: item.category1 || [cite_start]"Gıda", // [cite: 7047-7049]
        [cite_start]itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL, // [cite: 7049-7050]
        [cite_start]price: Number(item.price || 0).toFixed(2), // [cite: 7050-7052]
      })),
    };

    console.log("📦 Gönderilen veri:", {
      buyerEmail: request_data.buyer.email,
      totalPrice,
      itemCount: items.length,
    });

    // Kütüphaneyi kullanarak ödemeyi başlat
    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(request_data, (err, result2) => {
        if (err) {
          console.error("❌ İyzico hatası:", err);
          reject(err);
        } else {
          resolve(result2);
        }
      });
    });

    if (result.status === "success") {
      console.log("✅ Başarılı istek:", result.paymentPageUrl);
      return new Response(
        JSON.stringify({
          success: true,
          paymentPageUrl: result.paymentPageUrl,
          token: result.token,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      console.error("❌ İyzico başarısız:", result.errorMessage);
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