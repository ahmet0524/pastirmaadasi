export async function GET() {
  try {
    const Iyzipay = (await import("iyzipay")).default;

    const iyzipay = new Iyzipay({
      apiKey: "sandbox-iMWOs8liBFXBEw49vXevtfru7ZnPkIDs",
      secretKey: "sandbox-cUbewaUJPvAzNUUMsXaGzbUzK2gsYudG",
      uri: "https://sandbox-api.iyzipay.com",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "İyzipay kütüphanesi başarıyla yüklendi!",
        currency: Iyzipay.CURRENCY.TRY,
        locale: Iyzipay.LOCALE.TR
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}