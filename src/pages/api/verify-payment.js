// src/pages/api/verify-payment.js
import crypto from 'crypto';
import { Resend } from "resend";
import Iyzipay from "iyzipay";
import { createClient } from '@supabase/supabase-js';

// Email templates import
import {
  headerBlock,
  sectionCard,
  keyValueRow,
  itemsTable,
  adminItemsTable,
  couponsBlock,
  totalBlock,
  bankTransferBlock,
  codBlock,
  nextStepsBlock,
  footer,
  adminFooter,
  adminTodoBlock,
  currencyTRY,
  badge,
  isValidEmail,
  SITE_ORIGIN,
  LOGO_URL
} from '../../lib/email-templates.js';

export const prerender = false;

// ---- Config ----
const resend = new Resend(import.meta.env.RESEND_API_KEY);
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

const FROM_EMAIL = "Pastırma Adası <siparis@successodysseyhub.com>";
const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL || "successodysseyhub@gmail.com";

// ---- Customer Email Template ----
function getCustomerEmailHTML({
  customerName,
  customerEmail,
  orderNumber,
  items,
  total,
  orderDate,
  shippingAddress,
  customerPhone,
  invoiceType,
  companyName,
  taxOffice,
  taxNumber,
  orderNote,
  appliedCoupons,
  paymentMethod,
  bankDetails
}) {
  // Header / Durum
  let gradient = 'linear-gradient(135deg,#14b8a6,#0ea5e9)';
  let icon = '✅';
  let title = 'Siparişiniz Alındı';
  let status = badge({ text: 'Ödeme Alındı', bg: '#ecfeff', color: '#0e7490' });

  if (paymentMethod === 'cod') {
    gradient = 'linear-gradient(135deg,#f59e0b,#d97706)';
    icon = '💵';
    title = 'Kapıda Ödeme Siparişiniz Alındı';
    status = badge({ text: 'Kapıda Ödeme', bg: '#fff7ed', color: '#92400e' });
  } else if (paymentMethod === 'bank_transfer') {
    gradient = 'linear-gradient(135deg,#38bdf8,#0ea5e9)';
    icon = '🏦';
    title = 'Havale/EFT Bilgileri';
    status = badge({ text: 'Ödeme Bekleniyor', bg: '#eff6ff', color: '#1d4ed8' });
  }

  const header = headerBlock({ title, icon, gradient });

  const orderInfo = sectionCard({
    title: 'Sipariş Özeti',
    emoji: '📋',
    body: `
      ${keyValueRow('Sipariş No', `<code style="background:#fff7ed;padding:6px 10px;border-radius:10px;color:#b45309;font-weight:900">${orderNumber}</code>`)}
      ${keyValueRow('Tarih', orderDate)}
      ${keyValueRow('Telefon', customerPhone || 'Belirtilmemiş')}
      ${keyValueRow('E-posta', customerEmail ? `<a href="mailto:${customerEmail}" style="color:#0284c7;text-decoration:none;font-weight:800">${customerEmail}</a>` : '—', true)}
      <div style="margin-top:12px">${status}</div>
    `
  });

  const addresses = sectionCard({
    title: 'Teslimat Adresi',
    emoji: '📦',
    body: `
      <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:12px;color:#0f172a;font-weight:600">${shippingAddress}</div>
      ${invoiceType === 'corporate' && companyName ? `
        <div style="margin-top:10px">
          ${badge({ text: `🏢 Kurumsal: ${companyName}`, bg: '#ecfeff', color: '#0e7490' })}
        </div>
        ${taxOffice ? `<div style="margin-top:6px;color:#334155;font-weight:700">Vergi Dairesi: ${taxOffice}</div>` : ''}
        ${taxNumber ? `<div style="margin-top:2px;color:#334155;font-weight:700">Vergi No: ${taxNumber}</div>` : ''}
      ` : ''}
    `
  });

  const products = sectionCard({
    title: 'Sipariş Edilen Ürünler',
    emoji: '🛒',
    body: itemsTable(items),
    accent: '#0ea5e9'
  });

  const total_block = totalBlock(total);

  const noteBlock = orderNote
    ? sectionCard({
        title: 'Sipariş Notunuz',
        emoji: '📝',
        body: `<div style="background:#fff;border:1px dashed #94a3b8;border-radius:10px;padding:12px;color:#0f172a;line-height:1.6">${orderNote}</div>`,
        accent: '#94a3b8'
      })
    : '';

  const coupons = couponsBlock(appliedCoupons);

  const nextSteps = (paymentMethod === 'bank_transfer')
    ? bankTransferBlock({ orderNumber, total, bankDetails })
    : (paymentMethod === 'cod')
    ? codBlock()
    : nextStepsBlock(paymentMethod);

  return `
  <!doctype html>
  <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:680px;margin:0 auto;padding:20px">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(2,6,23,0.12);border:1px solid #e5e7eb;">
        ${header}
        <div style="padding:20px">
          ${orderInfo}
          ${addresses}
          ${products}
          ${total_block}
          ${coupons}
          ${noteBlock}
          ${nextSteps}
        </div>
        ${footer()}
      </div>
    </div>
  </body></html>`;
}

// ---- Admin Email Template ----
function getAdminEmailHTML({
  customerName,
  customerEmail,
  customerPhone,
  customerIdentity,
  orderNumber,
  items,
  total,
  orderDate,
  shippingAddress,
  billingAddress,
  invoiceType,
  companyName,
  taxOffice,
  taxNumber,
  orderNote,
  appliedCoupons,
  isDifferentBilling,
  paymentMethod,
  paymentStatus
}) {
  // Header / Durum
  let gradient = 'linear-gradient(135deg,#14b8a6,#0ea5e9)';
  let icon = '🔔';
  let title = 'Yeni Sipariş';

  if (paymentMethod === 'online') {
    gradient = 'linear-gradient(135deg,#14b8a6,#0ea5e9)';
    icon = '✅';
    title = 'Ödemeli Sipariş';
  } else if (paymentMethod === 'cod') {
    gradient = 'linear-gradient(135deg,#f59e0b,#d97706)';
    icon = '💵';
    title = 'Kapıda Ödeme Siparişi';
  } else if (paymentMethod === 'bank_transfer') {
    gradient = 'linear-gradient(135deg,#38bdf8,#0ea5e9)';
    icon = '🏦';
    title = 'Havale/EFT Siparişi';
  }

  const header = headerBlock({ title, icon, gradient });

  const statusBadge = badge({
    text: `Durum: ${paymentStatus === 'completed' ? 'Tamamlandı' : paymentStatus === 'pending' ? 'Bekliyor' : 'Ödeme Bekleniyor'}`,
    bg: '#ecfeff',
    color: '#0e7490'
  });

  const orderInfo = sectionCard({
    title: 'Sipariş Özeti',
    emoji: '📋',
    body: `
      ${keyValueRow('Sipariş No', `<code style="background:#fff7ed;padding:6px 10px;border-radius:10px;color:#b45309;font-weight:900">${orderNumber}</code>`)}
      ${keyValueRow('Tarih', orderDate)}
      ${keyValueRow('Ödeme Yöntemi', paymentMethod === 'online' ? 'Online (KK)' : paymentMethod === 'cod' ? 'Kapıda Ödeme' : 'Havale/EFT')}
      ${keyValueRow('Tutar', `<strong>${currencyTRY(total)}</strong>`, true)}
      <div style="margin-top:12px">${statusBadge}</div>
    `
  });

  const customerBox = sectionCard({
    title: 'Müşteri Bilgileri',
    emoji: '👤',
    body: `
      ${keyValueRow('Ad Soyad', customerName)}
      ${keyValueRow('E-posta', customerEmail ? `<a href="mailto:${customerEmail}" style="color:#0284c7;text-decoration:none;font-weight:800">${customerEmail}</a>` : '—')}
      ${keyValueRow('Telefon', customerPhone || '—')}
      ${customerIdentity ? keyValueRow('TC Kimlik', customerIdentity, true) : keyValueRow('TC Kimlik', '—', true)}
    `
  });

  const addresses = sectionCard({
    title: 'Adresler',
    emoji: '📦',
    body: `
      <div style="display:grid;gap:10px">
        <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:12px">
          <div style="color:#64748b;font-weight:800;margin-bottom:6px">Teslimat</div>
          <div style="color:#0f172a;font-weight:700">${shippingAddress}</div>
        </div>
        ${isDifferentBilling ? `
          <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:12px">
            <div style="color:#64748b;font-weight:800;margin-bottom:6px">Fatura</div>
            <div style="color:#0f172a;font-weight:700">${billingAddress}</div>
          </div>
        ` : ''}
        ${invoiceType === 'corporate' && companyName ? `
          <div style="background:#ecfeff;border:1px dashed #06b6d4;border-radius:10px;padding:12px">
            <div style="color:#0e7490;font-weight:900;display:flex;gap:8px;align-items:center">🏢 Kurumsal • ${companyName}</div>
            ${taxOffice ? `<div style="margin-top:6px;color:#0f172a;font-weight:700">Vergi Dairesi: ${taxOffice}</div>` : ''}
            ${taxNumber ? `<div style="margin-top:2px;color:#0f172a;font-weight:700">Vergi No: ${taxNumber}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `
  });

  const products = sectionCard({
    title: '📋 Hazırlanacak Ürünler',
    emoji: '📦',
    body: adminItemsTable(items),
    accent: '#f59e0b'
  });

  const coupons = couponsBlock(appliedCoupons);

  const noteBlock = orderNote
    ? sectionCard({
        title: 'Müşteri Notu',
        emoji: '📝',
        body: `<div style="background:#fff;border:1px dashed #94a3b8;border-radius:10px;padding:12px;color:#0f172a;line-height:1.6">${orderNote}</div>`,
        accent: '#94a3b8'
      })
    : '';

  const todo = adminTodoBlock(paymentMethod);

  return `
  <!doctype html>
  <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:680px;margin:0 auto;padding:20px">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(2,6,23,0.12);border:1px solid #e5e7eb;">
        ${header}
        <div style="padding:20px">
          ${orderInfo}
          ${customerBox}
          ${addresses}
          ${products}
          ${coupons}
          ${noteBlock}
          ${todo}
        </div>
        ${adminFooter()}
      </div>
    </div>
  </body></html>`;
}

// ---- Main Handler ----
export async function POST({ request }) {
  console.log("🚀 VERIFY-PAYMENT: Ödeme doğrulanıyor...");

  try {
    const body = await request.json();
    const {
      token,
      paymentMethod,
      customerEmail: frontendEmail,
      customerName: frontendName,
      customerSurname: frontendSurname,
      customerPhone: frontendPhone,
      customerIdentity: frontendIdentity,
      customerAddress: frontendAddress,
      customerCity: frontendCity,
      customerZipcode: frontendZipcode,
      cartItems: frontendCartItems,
      appliedCoupons: frontendCoupons,
      invoiceType: frontendInvoiceType,
      companyName: frontendCompanyName,
      taxOffice: frontendTaxOffice,
      taxNumber: frontendTaxNumber,
      orderNote: frontendOrderNote,
      billingAddress: frontendBillingAddress,
      billingCity: frontendBillingCity,
      billingZipcode: frontendBillingZipcode,
      isDifferentBilling: frontendIsDifferentBilling
    } = body;

    console.log("📦 Frontend'den gelen bilgiler:", {
      paymentMethod,
      email: frontendEmail,
      name: frontendName,
      surname: frontendSurname,
      cartItemsCount: frontendCartItems?.length || 0,
      couponsCount: frontendCoupons?.length || 0
    });

    const validPaymentMethods = ['online', 'cod', 'bank_transfer'];
    const selectedPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'online';

    let iyzicoResult = null;
    let paymentId = null;
    let paidPrice = 0;

    if (selectedPaymentMethod === 'online') {
      if (!token) {
        return new Response(
          JSON.stringify({ status: "error", errorMessage: "Token eksik" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const apiKey = import.meta.env.IYZICO_API_KEY;
      const secretKey = import.meta.env.IYZICO_SECRET_KEY;
      const iyzipay = new Iyzipay({
        apiKey: apiKey,
        secretKey: secretKey,
        uri: "https://sandbox-api.iyzipay.com"
      });

      const retrieveRequest = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: Date.now().toString(),
        token: token,
      };

      iyzicoResult = await new Promise((resolve, reject) => {
        iyzipay.checkoutForm.retrieve(retrieveRequest, (err, data) => {
          if (err) return reject(err);
          return resolve(data);
        });
      });

      if (iyzicoResult.status !== "success" || iyzicoResult.paymentStatus !== "SUCCESS") {
        console.error("❌ Ödeme başarısız:", iyzicoResult.errorMessage);
        return new Response(
          JSON.stringify({
            status: "error",
            errorMessage: iyzicoResult.errorMessage || "Ödeme başarısız.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      paymentId = iyzicoResult.paymentId;
      paidPrice = parseFloat(iyzicoResult.paidPrice);
      console.log("✅ Ödeme Iyzico'da doğrulandı");
    } else {
      const cartTotal = frontendCartItems?.reduce((sum, item) =>
        sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0) || 0;

      const discountAmount = frontendCoupons?.reduce((sum, c) =>
        sum + (c.discountAmount || 0), 0) || 0;

      paidPrice = cartTotal - discountAmount;
      paymentId = `${selectedPaymentMethod.toUpperCase()}-${Date.now()}`;
      console.log(`✅ ${selectedPaymentMethod} siparişi oluşturuluyor - ${paidPrice}₺`);
    }

    console.log("💾 VERİTABANINA KAYDEDİLİYOR");

    const adminEmail = ADMIN_EMAIL;

    let customerEmail = frontendEmail?.trim() || iyzicoResult?.buyer?.email?.trim() || "";
    const isCustomerMailValid = isValidEmail(customerEmail);
    if (!isCustomerMailValid) {
      console.warn("⚠️ Müşteri e-postası geçersiz:", customerEmail);
      customerEmail = adminEmail;
    }

    const name = frontendName?.trim() || iyzicoResult?.buyer?.name || "Değerli";
    const surname = frontendSurname?.trim() || iyzicoResult?.buyer?.surname || "Müşterimiz";
    const fullName = `${name} ${surname}`.trim();

    const normalizedPhone = frontendPhone
      ? (frontendPhone.startsWith('+90') ? frontendPhone : `+90${frontendPhone}`)
      : (iyzicoResult?.buyer?.gsmNumber || '');

    const customerIdentity = frontendIdentity || iyzicoResult?.buyer?.identityNumber || '';

    let shippingAddress = '';
    if (frontendAddress && frontendCity) {
      shippingAddress = `${frontendAddress}, ${frontendCity}, Turkey`;
    } else if (iyzicoResult?.shippingAddress) {
      shippingAddress = `${iyzicoResult.shippingAddress.address}, ${iyzicoResult.shippingAddress.city}, ${iyzicoResult.shippingAddress.country}`;
    } else {
      shippingAddress = 'Adres bilgisi alınamadı';
    }

    let billingAddress = shippingAddress;
    if (frontendIsDifferentBilling && frontendBillingAddress && frontendBillingCity) {
      billingAddress = `${frontendBillingAddress}, ${frontendBillingCity}, Turkey`;
    }

    const orderDate = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let couponCodes = [];
    let couponDetails = [];
    let totalDiscountAmount = 0;

    if (frontendCoupons && Array.isArray(frontendCoupons) && frontendCoupons.length > 0) {
      couponCodes = frontendCoupons.map(c => c.code);
      couponDetails = frontendCoupons.map(c => ({
        code: c.code,
        percent: c.percent,
        discountAmount: c.discountAmount
      }));
      totalDiscountAmount = frontendCoupons.reduce((sum, c) => sum + (c.discountAmount || 0), 0);

      console.log("🎟️ Kuponlar işlendi:", {
        codes: couponCodes,
        totalDiscount: totalDiscountAmount
      });
    }

    let items = [];

    if (frontendCartItems && Array.isArray(frontendCartItems) && frontendCartItems.length > 0) {
      console.log("✅ Frontend sepet bilgisi kullanılıyor");
      items = frontendCartItems.map((item, index) => ({
        name: item.name || `Ürün ${index + 1}`,
        price: parseFloat(item.price || 0),
        quantity: item.quantity || 1,
        unit: item.unit || '500g'
      }));
    } else if (iyzicoResult?.basketItems && Array.isArray(iyzicoResult.basketItems)) {
      console.log("✅ Iyzico basket bilgisi kullanılıyor");
      items = iyzicoResult.basketItems.map((item, index) => ({
        name: item.name || item.itemName || `Ürün ${index + 1}`,
        price: parseFloat(item.price || 0),
        quantity: 1,
        unit: '500g'
      }));
    }

    if (items.length === 0) {
      console.error("❌ UYARI: Ürün listesi tamamen boş!");
    } else {
      console.log(`✅ ${items.length} adet ürün işlendi`);
    }

    const orderNumber = `ORD-${Date.now()}`;

    let paymentStatus = 'completed';
    if (selectedPaymentMethod === 'bank_transfer') {
      paymentStatus = 'awaiting_transfer';
    } else if (selectedPaymentMethod === 'cod') {
      paymentStatus = 'pending';
    }

    const bankDetails = {
      bankName: 'Türkiye İş Bankası',
      accountHolder: 'PASTIRMA ADASI GIDA SAN. TİC. LTD. ŞTİ.',
      iban: import.meta.env.BANK_IBAN || 'TR33 0006 4000 0011 2345 6789 01'
    };

    // ----- DB + Emails -----
// ✅ DÜZELTME: verify-payment.js dosyasındaki Supabase insert kısmını
// Satır ~300 civarında şu kod bloğunu bul ve değiştir:

const [dbResult, customerEmailResult, adminEmailResult] = await Promise.allSettled([
  supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      payment_id: paymentId,
      payment_method: selectedPaymentMethod,
      customer_name: fullName,
      customer_email: customerEmail,
      // ✅ DOĞRU: customer_address (shipping_address değil!)
      customer_address: shippingAddress,
      // ✅ DOĞRU: customer_phone
      customer_phone: normalizedPhone || '',
      items: items,
      subtotal: paidPrice,
      shipping: 0, // shipping_cost yerine shipping
      // ✅ DOĞRU: discount (discount_amount değil!)
      discount: totalDiscountAmount,
      total: paidPrice,
      // ✅ Fatura bilgileri - Kolonlar mevcut
      invoice_type: frontendInvoiceType || 'individual',
      company_name: frontendCompanyName || null,
      tax_office: frontendTaxOffice || null,
      tax_number: frontendTaxNumber || null,
      order_note: frontendOrderNote || null,
      billing_address: frontendIsDifferentBilling ? billingAddress : null,
      is_different_billing: frontendIsDifferentBilling || false,
      // ✅ Kupon bilgileri - Kolonlar mevcut
      coupon_codes: couponCodes.length > 0 ? couponCodes : null,
      coupon_details: couponDetails.length > 0 ? couponDetails : null,
      total_discount: totalDiscountAmount,
      coupon_code: couponCodes.length > 0 ? couponCodes[0] : null,
      // ✅ Durum bilgileri
      status: 'pending',
      payment_status: paymentStatus,
      // ✅ Notes alanına sadece TC kimlik ve ekstra önemli notlar
      notes: [
        selectedPaymentMethod === 'bank_transfer' ? 'Havale/EFT' :
        selectedPaymentMethod === 'cod' ? 'Kapıda Ödeme' : null,
        customerIdentity ? `TC: ${customerIdentity}` : null,
        frontendOrderNote ? `Not: ${frontendOrderNote}` : null
      ].filter(Boolean).join(' | ') || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single(),

      isCustomerMailValid
        ? resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject:
              selectedPaymentMethod === 'bank_transfer'
                ? `🏦 Siparişiniz Oluşturuldu - Ödeme Bekleniyor (${paymentId})`
                : selectedPaymentMethod === 'cod'
                ? `💵 Siparişiniz Alındı - Kapıda Ödeme (${paymentId})`
                : `✅ Siparişiniz Alındı! (${paymentId})`,
            html: getCustomerEmailHTML({
              customerName: fullName,
              customerEmail,
              orderNumber: paymentId,
              items,
              total: paidPrice,
              orderDate,
              shippingAddress,
              customerPhone: normalizedPhone,
              invoiceType: frontendInvoiceType,
              companyName: frontendCompanyName,
              taxOffice: frontendTaxOffice,
              taxNumber: frontendTaxNumber,
              orderNote: frontendOrderNote,
              appliedCoupons: couponDetails,
              paymentMethod: selectedPaymentMethod,
              bankDetails
            })
          })
        : Promise.resolve({ skipped: true }),

      resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        subject:
          selectedPaymentMethod === 'bank_transfer'
            ? `🏦 YENİ SİPARİŞ - HAVALE BEKLENİYOR - ${fullName} (${currencyTRY(paidPrice)})`
            : selectedPaymentMethod === 'cod'
            ? `💵 YENİ SİPARİŞ - KAPIDA ÖDEME - ${fullName} (${currencyTRY(paidPrice)})`
            : `✅ YENİ SİPARİŞ - ${fullName} (${currencyTRY(paidPrice)})`,
        html: getAdminEmailHTML({
          customerName: fullName,
          customerEmail,
          customerPhone: normalizedPhone,
          customerIdentity,
          orderNumber: paymentId,
          items,
          total: paidPrice,
          orderDate,
          shippingAddress,
          billingAddress: frontendIsDifferentBilling ? billingAddress : shippingAddress,
          invoiceType: frontendInvoiceType,
          companyName: frontendCompanyName,
          taxOffice: frontendTaxOffice,
          taxNumber: frontendTaxNumber,
          orderNote: frontendOrderNote,
          appliedCoupons: couponDetails,
          isDifferentBilling: frontendIsDifferentBilling,
          paymentMethod: selectedPaymentMethod,
          paymentStatus
        }),
        replyTo: isCustomerMailValid ? customerEmail : undefined
      })
    ]);

    if (dbResult.status === 'fulfilled') {
      console.log("✅ Sipariş veritabanına kaydedildi");
    } else {
      console.error("❌ Veritabanı hatası:", dbResult.reason);
    }

    if (customerEmailResult.status === 'fulfilled' && !customerEmailResult.value?.skipped) {
      console.log("✅ Müşteriye email gönderildi:", customerEmail);
    } else if (customerEmailResult.status === 'rejected') {
      console.error("❌ Müşteri emaili gönderilemedi:", customerEmailResult.reason);
    }

    if (adminEmailResult.status === 'fulfilled') {
      console.log("✅ Admin emaili gönderildi:", adminEmail);
    } else {
      console.error("❌ Admin emaili gönderilemedi:", adminEmailResult.reason);
    }

    return new Response(
      JSON.stringify({
        status: "success",
        emailSent: customerEmailResult.status === 'fulfilled' && !customerEmailResult.value?.skipped,
        paymentId,
        paidPrice,
        couponsApplied: couponCodes.length,
        paymentMethod: selectedPaymentMethod,
        paymentStatus
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("💥 VERIFY-PAYMENT Genel Hata:", error);
    return new Response(
      JSON.stringify({ status: "error", errorMessage: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}