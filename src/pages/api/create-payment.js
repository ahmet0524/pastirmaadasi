// src/pages/api/create-payment.js
import Iyzipay from "iyzipay";

// API key'lerinizi .env dosyasından çekmeniz daha güvenlidir
const iyzipay = new Iyzipay({
  apiKey: import.meta.env.IYZICO_API_KEY || "sandbox-iMWOs8liBFXBEw49vXevtfru7ZnPkIDs",
  secretKey: import.meta.env.IYZICO_SECRET_KEY || "sandbox-cUbewaUJPvAzNUUMsXaGzbUzK2gsYudG",
  uri: "https://sandbox-api.iyzipay.com",
});

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

    // Sitenizin canlı URL'sini buraya ekleyin (veya .env dosyasından çekin)
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || "https://pastirmaadasi.vercel.app/";
    const callbackUrl = `${baseUrl}api/payment-callback`;
    console.log("🔗 Callback URL:", callbackUrl);

    const request_data = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: totalPrice,
      paidPrice: totalPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: Date.now().toString(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: buyer?.id || "BY" + Date.now(),
        name: buyer?.name || "Müşteri",
        surname: buyer?.surname || "",
        gsmNumber: buyer?.gsmNumber || "+905555555555",
        email: buyer?.email || "test@example.com",
        identityNumber: buyer?.identityNumber || "11111111111",
        registrationAddress:
          buyer?.registrationAddress ||
          shippingAddress?.address ||
          "Kayseri, Türkiye",
        ip: buyer?.ip || "85.34.78.112", // IP'yi request'ten almak daha doğrudur
        city: buyer?.city || shippingAddress?.city || "Kayseri",
        country: buyer?.country || "Turkey",
      },
      shippingAddress: {
        contactName:
          shippingAddress?.contactName || `${buyer?.name} ${buyer?.surname}`,
        city: shippingAddress?.city || "Kayseri",
        country: shippingAddress?.country || "Turkey",
        address: shippingAddress?.address || "Kayseri, Türkiye",
      },
      billingAddress: {
        contactName:
          billingAddress?.contactName || `${buyer?.name} ${buyer?.surname}`,
        city: billingAddress?.city || "Kayseri",
        country: billingAddress?.country || "Turkey",
        address: billingAddress?.address || "Kayseri, Türkiye",
      },
      basketItems: items.map((item, index) => ({
        id: item.id || `item_${index + 1}`,
        name: item.name || "Ürün",
        category1: item.category1 || "Gıda",
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: Number(item.price || 0).toFixed(2),
      })),
    };

    console.log("📦 İyzico'ya gönderilen veri:", {
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