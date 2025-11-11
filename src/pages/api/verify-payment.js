// src/pages/api/verify-payment.js
import crypto from 'crypto';
import { Resend } from "resend";
import Iyzipay from "iyzipay";
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// ---- Config ----
const resend = new Resend(import.meta.env.RESEND_API_KEY);
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_ORIGIN = 'https://pastirmaadasi.com';
const LOGO_URL = `${SITE_ORIGIN}/assets/image/logo/Pastirma-Adasi-logo.webp`; // e-posta için mutlak URL
const FROM_EMAIL = "Pastırma Adası <siparis@successodysseyhub.com>";
const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL || "successodysseyhub@gmail.com";

// ---- Utils ----
function isValidEmail(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function currencyTRY(n) {
  const v = Number(n || 0);
  return `${v.toFixed(2)}₺`;
}

function badge({ text, bg, color }) {
  return `<span style="display:inline-block;padding:8px 14px;border-radius:999px;font-weight:800;font-size:13px;background:${bg};color:${color};">${text}</span>`;
}

function headerBlock({ title, icon, gradient }) {
  return `
    <div style="background:${gradient};padding:40px 20px;text-align:center;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.05)"/></svg>');opacity:0.1;"></div>
      <img src="${LOGO_URL}" width="140" height="auto" alt="Pastırma Adası" style="display:block;margin:0 auto 16px auto;border-radius:16px;background:#fff;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);position:relative;"/>
      <div style="font-size:64px;line-height:1;margin-bottom:12px;position:relative;">${icon}</div>
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:0.5px;text-shadow:0 2px 8px rgba(0,0,0,0.2);position:relative;">${title}</h1>
    </div>
  `;
}

function sectionCard({ title, emoji, body, accent = '#14b8a6' }) {
  return `
    <div style="background:#ffffff;border:2px solid #e5e7eb;border-left:5px solid ${accent};border-radius:16px;margin:20px 0;padding:24px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.3s ease;">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #f1f5f9;">
        <span style="font-size:28px;line-height:1;">${emoji}</span>
        <div style="font-weight:900;color:#0f172a;font-size:18px;letter-spacing:0.3px;">${title}</div>
      </div>
      <div style="color:#334155;line-height:1.6;">
        ${body}
      </div>
    </div>
  `;
}

function keyValueRow(label, value, last = false) {
  return `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;${last ? '' : 'border-bottom:1px solid #eef2f7'}">
      <span style="color:#64748b;font-weight:700">${label}</span>
      <span style="color:#0f172a;font-weight:700">${value}</span>
    </div>
  `;
}

function itemsTable(items) {
  if (!items || !items.length) {
    return `<div style="padding:32px;text-align:center;color:#94a3b8;background:#f8fafc;border-radius:12px;font-weight:600;">Ürün detayları bulunamadı</div>`;
  }
  const rows = items.map((it, i) => {
    const name = it.name ?? `Ürün ${i + 1}`;
    const qty = it.quantity ?? 1;
    const unit = it.unit ?? '500g';
    const price = Number(it.price || 0);
    const total = price * qty;
    return `
      <tr style="background:${i % 2 ? '#f8fafc' : '#ffffff'};transition:background 0.2s ease;">
        <td style="padding:16px 14px;font-weight:700;color:#0f172a;font-size:15px;">${name}</td>
        <td style="padding:16px 14px;text-align:center;color:#0f172a;font-weight:600;font-size:15px;">${qty}</td>
        <td style="padding:16px 14px;text-align:center;color:#64748b;font-size:14px;">${unit}</td>
        <td style="padding:16px 14px;text-align:right;color:#0f172a;font-weight:600;font-size:15px;">${currencyTRY(price)}</td>
        <td style="padding:16px 14px;text-align:right;font-weight:900;color:#0f172a;font-size:16px;">${currencyTRY(total)}</td>
      </tr>
    `;
  }).join('');
  return `
    <div style="overflow:auto;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:2px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%);">
            <th style="text-align:left;padding:16px 14px;color:#ffffff;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Ürün</th>
            <th style="text-align:center;padding:16px 14px;color:#ffffff;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Adet</th>
            <th style="text-align:center;padding:16px 14px;color:#ffffff;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Birim</th>
            <th style="text-align:right;padding:16px 14px;color:#ffffff;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Birim Fiyat</th>
            <th style="text-align:right;padding:16px 14px;color:#ffffff;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Tutar</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function adminItemsTable(items) {
  if (!items || !items.length) {
    return `<div style="padding:32px;text-align:center;color:#94a3b8;background:#fef2f2;border-radius:12px;font-weight:600;border:2px dashed #fca5a5;">⚠️ ÜRÜN BİLGİSİ YOK!</div>`;
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.price || 0) * (it.quantity || 1)), 0);

  const rows = items.map((it, i) => {
    const name = it.name ?? `Ürün ${i + 1}`;
    const qty = it.quantity ?? 1;
    const unit = it.unit ?? '500g';
    const price = Number(it.price || 0);
    const total = price * qty;
    return `
      <tr style="background:${i % 2 ? '#fffbeb' : '#ffffff'};border-bottom:1px solid #fde68a;">
        <td style="padding:18px 16px;font-weight:800;color:#0f172a;font-size:16px;border-right:1px solid #fde68a;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="background:#f59e0b;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:900;">#{i + 1}</span>
            <span>${name}</span>
          </div>
        </td>
        <td style="padding:18px 16px;text-align:center;color:#0f172a;font-weight:700;font-size:18px;border-right:1px solid #fde68a;">
          <span style="background:#fef3c7;padding:6px 12px;border-radius:8px;display:inline-block;">${qty}</span>
        </td>
        <td style="padding:18px 16px;text-align:center;color:#78716c;font-size:14px;font-weight:600;border-right:1px solid #fde68a;">${unit}</td>
        <td style="padding:18px 16px;text-align:right;color:#0f172a;font-weight:700;font-size:16px;border-right:1px solid #fde68a;">${currencyTRY(price)}</td>
        <td style="padding:18px 16px;text-align:right;font-weight:900;color:#0f172a;font-size:18px;background:#fef3c7;">${currencyTRY(total)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="overflow:auto;border-radius:12px;box-shadow:0 4px 12px rgba(245,158,11,0.2);">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:3px solid #f59e0b;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <th style="text-align:left;padding:18px 16px;color:#ffffff;font-weight:900;font-size:15px;text-transform:uppercase;letter-spacing:0.8px;">📦 Ürün Adı</th>
            <th style="text-align:center;padding:18px 16px;color:#ffffff;font-weight:900;font-size:15px;text-transform:uppercase;letter-spacing:0.8px;">Adet</th>
            <th style="text-align:center;padding:18px 16px;color:#ffffff;font-weight:900;font-size:15px;text-transform:uppercase;letter-spacing:0.8px;">Birim</th>
            <th style="text-align:right;padding:18px 16px;color:#ffffff;font-weight:900;font-size:15px;text-transform:uppercase;letter-spacing:0.8px;">Birim ₺</th>
            <th style="text-align:right;padding:18px 16px;color:#ffffff;font-weight:900;font-size:15px;text-transform:uppercase;letter-spacing:0.8px;">Toplam ₺</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background:#fef3c7;border-top:3px solid #f59e0b;">
            <td colspan="4" style="padding:18px 16px;text-align:right;font-weight:900;color:#92400e;font-size:16px;text-transform:uppercase;">ARA TOPLAM:</td>
            <td style="padding:18px 16px;text-align:right;font-weight:900;color:#92400e;font-size:20px;">${currencyTRY(subtotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function couponsBlock(appliedCoupons) {
  if (!appliedCoupons || !appliedCoupons.length) return '';
  const totalDiscount = appliedCoupons.reduce((s, c) => s + (Number(c.discountAmount) || 0), 0);
  const rows = appliedCoupons.map(c => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#ecfeff;border:1px dashed #06b6d4;border-radius:10px;margin:8px 0">
      <div style="font-weight:800;color:#0e7490">🎟️ ${c.code} • %${c.percent}</div>
      <div style="font-weight:900;color:#0f172a">-${currencyTRY(c.discountAmount)}</div>
    </div>
  `).join('');
  return sectionCard({
    title: 'Uygulanan Kuponlar',
    emoji: '🎉',
    accent: '#06b6d4',
    body: `
      ${rows}
      <div style="margin-top:10px;text-align:right;font-weight:900;color:#0f172a">
        Toplam İndirim: <span style="color:#dc2626">${currencyTRY(totalDiscount)}</span>
      </div>
    `
  });
}

// ---- Customer Email Template ----
function getCustomerEmailHTML({
  customerName,
  customerEmail,        // eklendi: mail içinde link için
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
  paymentMethod,        // 'online' | 'cod' | 'bank_transfer'
  bankDetails           // { bankName, accountHolder, iban }
}) {
  // header / durum
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

 const totalBlock = `
  <div style="text-align:center;margin:30px 0;padding:30px 20px;background:linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%);border-radius:16px;border:2px solid #14b8a6;box-shadow:0 4px 12px rgba(20,184,166,0.15);">
    <div style="font-size:14px;color:#0e7490;font-weight:800;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Toplam Tutar</div>
    <div style="font-size:48px;font-weight:900;color:#0f172a;text-shadow:0 2px 4px rgba(0,0,0,0.1);">${currencyTRY(total)}</div>
    <div style="margin-top:12px;font-size:13px;color:#64748b;font-weight:600;">KDV Dahil</div>
  </div>
`;

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
    ? sectionCard({
        title: 'Havale/EFT Talimatı',
        emoji: '🏦',
        body: `
          <div style="display:grid;gap:8px">
            ${keyValueRow('Banka', bankDetails?.bankName || 'Banka')}
            ${keyValueRow('Hesap Sahibi', bankDetails?.accountHolder || 'Pastırma Adası')}
            ${keyValueRow('IBAN', `<code style="font-weight:900">${bankDetails?.iban || 'TR**'}</code>`, true)}
          </div>
          <div style="margin-top:10px;background:#fff7ed;border:1px dashed #f59e0b;border-radius:10px;padding:12px;color:#b45309;font-weight:700;text-align:center">
            EFT/Havale açıklamasına <strong>${orderNumber}</strong> yazınız.
          </div>
        `,
        accent: '#0ea5e9'
      })
    : sectionCard({
        title: 'Sonraki Adımlar',
        emoji: '🚚',
        body: `
          <div style="color:#0f172a;line-height:1.7">
            Siparişiniz hazırlanacak ve en kısa sürede kargoya verilecektir.<br/>
            Kargo takip bilgileri e-posta ile paylaşılacaktır.
          </div>
        `,
        accent: '#14b8a6'
      });

const footer = `
  <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);color:#94a3b8;text-align:center;padding:32px 20px;border-radius:0 0 20px 20px;position:relative;">
    <div style="color:#ffffff;font-weight:900;font-size:20px;margin-bottom:8px;">Pastırma Adası</div>
    <div style="font-size:14px;margin-top:6px;color:#cbd5e1;font-weight:600;">Kayseri'nin geleneksel lezzeti</div>
    <a href="${SITE_ORIGIN}" style="display:inline-block;margin-top:12px;color:#38bdf8;text-decoration:none;font-weight:800;font-size:15px;padding:8px 16px;background:rgba(56,189,248,0.1);border-radius:8px;transition:all 0.3s ease;">${SITE_ORIGIN.replace('https://','')}</a>
    <div style="font-size:12px;color:#64748b;margin-top:16px;padding-top:16px;border-top:1px solid #334155;">Bu otomatik bir e-postadır, lütfen yanıtlamayın.</div>
  </div>
`;

  return `
  <!doctype html>
  <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:20px">
    <div style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(2,6,23,0.12);border:1px solid #e5e7eb;">
        ${header}
        <div style="padding:18px 16px">
          ${orderInfo}
          ${addresses}
          ${products}
          ${totalBlock}
          ${coupons}
          ${noteBlock}
          ${nextSteps}
        </div>
        ${footer}
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
  paymentMethod,         // 'online' | 'cod' | 'bank_transfer'
  paymentStatus
}) {
  // header / durum
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

  const todo = sectionCard({
    title: 'Yapılacaklar',
    emoji: '✅',
    body: `
      <div style="display:grid;gap:8px">
        ${paymentMethod === 'bank_transfer' ? `<div style="background:#eff6ff;border:1px dashed #93c5fd;border-radius:10px;padding:10px;color:#1d4ed8;font-weight:800">Havale/EFT kontrolü yap ve onayla</div>` : ''}
        <div style="background:#ecfeff;border:1px dashed #06b6d4;border-radius:10px;padding:10px;color:#0e7490;font-weight:800">Siparişi hazırla ve paketle</div>
        <div style="background:#e6fffb;border:1px dashed #2dd4bf;border-radius:10px;padding:10px;color:#0f766e;font-weight:800">Kargoya ver ve takip numarasını ilet</div>
      </div>
    `,
    accent: '#14b8a6'
  });

  const footer = `
    <div style="background:#0f172a;color:#94a3b8;text-align:center;padding:18px;border-radius:0 0 20px 20px">
      <div style="color:#ffffff;font-weight:900">Pastırma Adası • Admin</div>
      <div style="font-size:11px;color:#64748b;margin-top:10px;border-top:1px solid #1f2937;padding-top:10px">Bu otomatik bildirim e-postasıdır.</div>
    </div>
  `;

  return `
  <!doctype html>
  <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
  <body style="margin:0;padding:0;background:#f1f5f9">
    <div style="max-width:680px;margin:0 auto;padding:16px">
      <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,.08)">
        ${header}
        <div style="padding:18px 16px">
          ${orderInfo}
          ${customerBox}
          ${addresses}
          ${products}
          ${coupons}
          ${noteBlock}
          ${todo}
        </div>
        ${footer}
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

    console.log("💾 VERİTABANINA KAYDEDILIYOR");

    const adminEmail = ADMIN_EMAIL;

    let customerEmail = frontendEmail?.trim() || iyzicoResult?.buyer?.email?.trim() || "";
    const isCustomerMailValid = isValidEmail(customerEmail);
    if (!isCustomerMailValid) {
      console.warn("⚠️ Müşteri e-postası geçersiz:", customerEmail);
      customerEmail = adminEmail; // fallback
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
      bankName: 'Ziraat Bankası',
      accountHolder: 'PASTIRMA ADASI',
      iban: import.meta.env.BANK_IBAN || 'TR00 0000 0000 0000 0000 0000 00'
    };

    // ----- DB + Emails -----
    const [dbResult, customerEmailResult, adminEmailResult] = await Promise.allSettled([
      supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          payment_id: paymentId,
          payment_method: selectedPaymentMethod,
          customer_name: fullName,
          customer_email: customerEmail,
          customer_phone: normalizedPhone || '',
          customer_address: shippingAddress,
          items: items,
          subtotal: paidPrice,
          shipping_cost: 0,
          discount_amount: totalDiscountAmount,
          total: paidPrice,
          invoice_type: frontendInvoiceType || 'individual',
          company_name: frontendCompanyName || null,
          tax_office: frontendTaxOffice || null,
          tax_number: frontendTaxNumber || null,
          order_note: frontendOrderNote || null,
          billing_address: frontendIsDifferentBilling ? billingAddress : null,
          is_different_billing: frontendIsDifferentBilling || false,
          coupon_codes: couponCodes.length > 0 ? couponCodes : null,
          coupon_details: couponDetails.length > 0 ? couponDetails : null,
          total_discount: totalDiscountAmount,
          coupon_code: couponCodes.length > 0 ? couponCodes[0] : null,
          status: 'pending',
          payment_status: paymentStatus,
          notes: customerIdentity ? `TC: ${customerIdentity}` : null,
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
              customerEmail,               // eklendi
              orderNumber: paymentId,      // e-postada ödeme id gösteriyoruz
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
