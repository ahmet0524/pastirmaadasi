import crypto from 'crypto';
import { Resend } from "resend";
import Iyzipay from "iyzipay";
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email validasyonu
function isValidEmail(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Email şablonları (kısaltılmış)
function getCustomerEmailHTML({ customerName, orderNumber, items, total, orderDate, shippingAddress, customerPhone, paymentId }) {
  return `<h2>Siparişiniz Alındı!</h2><p>${customerName}, ödemeniz tamamlandı.</p>`;
}
function getAdminEmailHTML({ customerName, orderNumber, items, total, orderDate, shippingAddress }) {
  return `<h2>Yeni Sipariş</h2><p>${customerName} - ${total}₺</p>`;
}

export async function POST({ request }) {
  console.log("🚀 VERIFY-PAYMENT: ödeme doğrulama başlatıldı...");
  let orderNumber = `ORD-${Date.now()}`;

  try {
    const body = await request.json();
    const { token, customerEmail, customerName, customerSurname, customerPhone, customerIdentity, customerAddress, customerCity, cartItems } = body;

    if (!token) {
      return new Response(JSON.stringify({ status: "error", errorMessage: "Token eksik" }), { status: 400 });
    }

    const iyzipay = new Iyzipay({
      apiKey: import.meta.env.IYZICO_API_KEY,
      secretKey: import.meta.env.IYZICO_SECRET_KEY,
      uri: "https://sandbox-api.iyzipay.com"
    });

    // Iyzico doğrulama
    const result = await new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, conversationId: Date.now().toString(), token }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    if (result.status !== "success" || result.paymentStatus !== "SUCCESS") {
      return new Response(JSON.stringify({ status: "error", errorMessage: result.errorMessage || "Ödeme başarısız" }), { status: 400 });
    }

    const paymentId = result.paymentId || result.conversationId || `PAY-${Date.now()}`;
    const paidPrice = parseFloat(result.paidPrice);

    const fullName = `${customerName || 'Değerli'} ${customerSurname || 'Müşteri'}`.trim();
    const shippingAddress = `${customerAddress || ''}, ${customerCity || ''}`;
    const orderDate = new Date().toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const items = (cartItems && cartItems.length) ? cartItems : (result.basketItems || []).map(i => ({ name: i.name, price: i.price, quantity: 1 }));

    // Supabase kaydı
    try {
      await supabase.from('orders').insert({
        order_number: orderNumber,
        payment_id: paymentId,
        customer_name: fullName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: shippingAddress,
        items,
        total: paidPrice,
        status: 'pending',
        payment_status: 'completed',
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('❌ Supabase kayıt hatası:', e.message);
    }

    // Email gönderimlerini paralel yap
    const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';

    const emailTasks = [];

    if (isValidEmail(customerEmail)) {
      emailTasks.push(
        resend.emails.send({
          from: 'Pastırma Adası <siparis@successodysseyhub.com>',
          to: customerEmail,
          subject: `✅ Siparişiniz Alındı (#${orderNumber})`,
          html: getCustomerEmailHTML({ customerName: fullName, orderNumber, items, total: paidPrice, orderDate, shippingAddress, customerPhone, paymentId })
        })
      );
    }

    emailTasks.push(
      resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `🔔 Yeni Sipariş - ${fullName} (${paidPrice}₺)` ,
        html: getAdminEmailHTML({ customerName: fullName, orderNumber, items, total: paidPrice, orderDate, shippingAddress })
      })
    );

    Promise.all(emailTasks).catch(err => console.error('❌ Email gönderim hatası:', err));

    return new Response(JSON.stringify({ status: 'success', paymentId, orderNumber }), { status: 200 });

  } catch (error) {
    console.error('💥 Genel Hata:', error);
    return new Response(JSON.stringify({ status: 'error', errorMessage: error.message }), { status: 500 });
  }
}
