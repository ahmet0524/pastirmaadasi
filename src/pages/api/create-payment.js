import Iyzipay from "iyzipay";

export async function POST({ request }) {
  try {
    const body = await request.json();

    // Environment variable kontrolü
    if (!import.meta.env.IYZICO_API_KEY || !import.meta.env.IYZICO_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          status: "error",
          errorMessage: "Sunucu yapılandırma hatası. Lütfen site yöneticisiyle iletişime geçin.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: "https://sandbox-api.iyzipay.com",
    });

    const callbackUrl = `${
      import.meta.env.SITE_URL || "https://pastirmaadasi.vercel.app"
    }/api/payment-callback`;

    const paymentRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: body.price,
      paidPrice: body.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: body.basketId || "B" + Date.now(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: body.buyer,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      basketItems: body.basketItems,
    };

    return new Promise((resolve) => {
      iyzipay.checkoutFormInitialize.create(paymentRequest, (err, result) => {
        if (err) {
          const errorMessage =
            err.errorMessage || err.message || "Ödeme başlatılamadı";

          resolve(
            new Response(
              JSON.stringify({
                status: "error",
                errorMessage,
                errorCode: err.errorCode || "UNKNOWN",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            )
          );
        } else if (result.status === "success" && result.paymentPageUrl) {
          resolve(
            new Response(
              JSON.stringify({
                status: "success",
                paymentPageUrl: result.paymentPageUrl,
                token: result.token,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            )
          );
        } else {
          const errorMessage =
            result.errorMessage || "Ödeme sayfası oluşturulamadı";
          resolve(
            new Response(
              JSON.stringify({
                status: "error",
                errorMessage,
                iyzicoStatus: result.status,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            )
          );
        }
      });
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        errorMessage: "Sunucu hatası: " + (error.message || "Bilinmeyen hata"),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// (Opsiyonel) Test için GET endpoint
export async function GET() {
  return new Response(
    JSON.stringify({ status: "ok", message: "Create Payment API aktif" }),
    { headers: { "Content-Type": "application/json" } }
  );
}
