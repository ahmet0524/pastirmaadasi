import type { APIRoute } from 'astro';
import Iyzipay from 'iyzipay';

// Sadece backend'de (API route) kullanın
const iyzipay = new Iyzipay({
  apiKey: import.meta.env.IYZICO_API_KEY,
  secretKey: import.meta.env.IYZICO_SECRET_KEY,
  uri: 'https://sandbox-api.iyzipay.com' // Production: https://api.iyzipay.com
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const paymentRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: Date.now().toString(),
      price: body.price,
      paidPrice: body.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: body.basketId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: `${import.meta.env.PUBLIC_SITE_URL}/odeme-sonuc`,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: body.buyer,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      basketItems: body.basketItems
    };

    return new Promise((resolve) => {
      iyzipay.checkoutFormInitialize.create(paymentRequest, (err: any, result: any) => {
        if (err) {
          resolve(new Response(JSON.stringify({ error: err }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }));
        } else {
          resolve(new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      });
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Ödeme başlatılamadı' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};