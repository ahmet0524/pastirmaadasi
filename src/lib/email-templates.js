// src/lib/email-templates.js
// Email şablonları için ortak utility fonksiyonları

export const SITE_ORIGIN = 'https://pastirmaadasi.vercel.app';
export const LOGO_URL = `${SITE_ORIGIN}/assets/image/logo/Pastirma-Adasi-logo.webp`;

// ---- Helper Functions ----

export function isValidEmail(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function currencyTRY(n) {
  const v = Number(n || 0);
  return `${v.toFixed(2)}₺`;
}

export function badge({ text, bg, color }) {
  return `<span style="display:inline-block;padding:8px 14px;border-radius:999px;font-weight:800;font-size:13px;background:${bg};color:${color};">${text}</span>`;
}

export function headerBlock({ title, icon, gradient }) {
  return `
    <div style="background:${gradient};padding:40px 20px;text-align:center;position:relative;overflow:hidden;">
      <img src="${LOGO_URL}" width="140" height="auto" alt="Pastırma Adası" style="display:block;margin:0 auto 16px auto;border-radius:16px;background:#fff;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);position:relative;"/>
      <div style="font-size:64px;line-height:1;margin-bottom:12px;position:relative;">${icon}</div>
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:0.5px;text-shadow:0 2px 8px rgba(0,0,0,0.2);position:relative;">${title}</h1>
    </div>
  `;
}

export function sectionCard({ title, emoji, body, accent = '#14b8a6' }) {
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

export function keyValueRow(label, value, last = false) {
  return `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;${last ? '' : 'border-bottom:1px solid #eef2f7'}">
      <span style="color:#64748b;font-weight:700">${label}</span>
      <span style="color:#0f172a;font-weight:700">${value}</span>
    </div>
  `;
}

// ---- Customer Email Tables ----

export function itemsTable(items) {
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

// ---- Admin Email Tables ----

export function adminItemsTable(items) {
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
            <span style="background:#f59e0b;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:900;">${i + 1}</span>
            <span>${name}</span>
          </div>
        </td>
        <td style="padding:18px 16px;text-align:center;color:#0f172a;font-weight:700;font-size:18px;border-right:1px solid #fde68a;">${qty}</td>
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

// ---- Coupons Block ----

export function couponsBlock(appliedCoupons) {
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

// ---- Total Amount Block ----

export function totalBlock(total) {
  return `
    <div style="text-align:center;margin:30px 0;padding:30px 20px;background:linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%);border-radius:16px;border:2px solid #14b8a6;box-shadow:0 4px 12px rgba(20,184,166,0.15);">
      <div style="font-size:14px;color:#0e7490;font-weight:800;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Toplam Tutar</div>
      <div style="font-size:48px;font-weight:900;color:#0f172a;text-shadow:0 2px 4px rgba(0,0,0,0.1);">${currencyTRY(total)}</div>
      <div style="margin-top:12px;font-size:13px;color:#64748b;font-weight:600;">KDV Dahil</div>
    </div>
  `;
}

// ---- Bank Transfer Instructions ----

export function bankTransferBlock({ orderNumber, total, bankDetails }) {
  return sectionCard({
    title: 'Havale/EFT Talimatı',
    emoji: '🏦',
    body: `
      <div style="display:grid;gap:8px">
        ${keyValueRow('Banka', bankDetails?.bankName || 'Türkiye İş Bankası')}
        ${keyValueRow('Hesap Sahibi', bankDetails?.accountHolder || 'PASTIRMA ADASI GIDA SAN. TİC. LTD. ŞTİ.')}
        ${keyValueRow('IBAN', `<code style="font-weight:900;background:#fff7ed;padding:4px 8px;border-radius:6px;color:#b45309;">${bankDetails?.iban || 'TR33 0006 4000 0011 2345 6789 01'}</code>`)}
        ${keyValueRow('Tutar', `<strong>${currencyTRY(total)}</strong>`, true)}
      </div>
      <div style="margin-top:16px;background:#fff7ed;border:2px dashed #f59e0b;border-radius:10px;padding:16px;text-align:center;">
        <div style="color:#b45309;font-weight:700;font-size:15px;margin-bottom:6px;">⚠️ Önemli</div>
        <div style="color:#92400e;font-weight:600;">EFT/Havale açıklamasına mutlaka <strong style="font-size:16px;">${orderNumber}</strong> sipariş numaranızı yazınız.</div>
      </div>
    `,
    accent: '#0ea5e9'
  });
}

// ---- Cash on Delivery Instructions ----

export function codBlock() {
  return sectionCard({
    title: 'Ödeme Bilgisi',
    emoji: '💵',
    body: `
      <div style="background:#fff7ed;border:2px dashed #f59e0b;border-radius:10px;padding:16px;text-align:center;">
        <div style="color:#b45309;font-weight:700;font-size:15px;margin-bottom:6px;">⚠️ Önemli Bilgi</div>
        <div style="color:#78350f;font-weight:600;line-height:1.6;">
          Ödemeyi teslimat sırasında <strong>nakit</strong> veya <strong>kredi kartı</strong> ile yapabilirsiniz.
        </div>
      </div>
    `,
    accent: '#f59e0b'
  });
}

// ---- Next Steps Block ----

export function nextStepsBlock(paymentMethod) {
  if (paymentMethod === 'bank_transfer' || paymentMethod === 'bank-transfer') {
    return sectionCard({
      title: 'Sonraki Adımlar',
      emoji: '⏳',
      body: `
        <div style="color:#0f172a;line-height:1.7;font-weight:600;">
          1️⃣ Havale/EFT işleminizi yukarıdaki bilgilere göre gerçekleştirin<br/>
          2️⃣ Ödemeniz onaylandıktan sonra siparişiniz hazırlanacaktır<br/>
          3️⃣ Kargo takip bilgileri e-posta ile paylaşılacaktır
        </div>
      `,
      accent: '#0ea5e9'
    });
  }

  return sectionCard({
    title: 'Sonraki Adımlar',
    emoji: '🚚',
    body: `
      <div style="color:#0f172a;line-height:1.7;font-weight:600;">
        Siparişiniz hazırlanacak ve en kısa sürede kargoya verilecektir.<br/>
        Kargo takip bilgileri e-posta ile paylaşılacaktır.
      </div>
    `,
    accent: '#14b8a6'
  });
}

// ---- Footer ----

export function footer() {
  return `
    <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);color:#94a3b8;text-align:center;padding:32px 20px;border-radius:0 0 20px 20px;position:relative;">
      <div style="color:#ffffff;font-weight:900;font-size:20px;margin-bottom:8px;">Pastırma Adası</div>
      <div style="font-size:14px;margin-top:6px;color:#cbd5e1;font-weight:600;">Kayseri'nin geleneksel lezzeti</div>
      <a href="${SITE_ORIGIN}" style="display:inline-block;margin-top:12px;color:#38bdf8;text-decoration:none;font-weight:800;font-size:15px;padding:8px 16px;background:rgba(56,189,248,0.1);border-radius:8px;transition:all 0.3s ease;">${SITE_ORIGIN.replace('https://','')}</a>
      <div style="font-size:12px;color:#64748b;margin-top:16px;padding-top:16px;border-top:1px solid #334155;">Bu otomatik bir e-postadır, lütfen yanıtlamayın.</div>
    </div>
  `;
}

// ---- Admin Footer ----

export function adminFooter() {
  return `
    <div style="background:#0f172a;color:#94a3b8;text-align:center;padding:24px 20px;border-radius:0 0 20px 20px;">
      <div style="color:#ffffff;font-weight:900;font-size:18px;">Pastırma Adası • Admin</div>
      <div style="font-size:12px;color:#64748b;margin-top:12px;border-top:1px solid #1f2937;padding-top:12px;">Bu otomatik bildirim e-postasıdır.</div>
    </div>
  `;
}

// ---- Admin To-Do Block ----

export function adminTodoBlock(paymentMethod) {
  const tasks = [];

  if (paymentMethod === 'bank_transfer' || paymentMethod === 'bank-transfer') {
    tasks.push('<div style="background:#eff6ff;border:2px dashed #93c5fd;border-radius:10px;padding:12px;color:#1d4ed8;font-weight:800;">🏦 Havale/EFT kontrolü yap ve onayla</div>');
  }

  tasks.push('<div style="background:#ecfeff;border:2px dashed #06b6d4;border-radius:10px;padding:12px;color:#0e7490;font-weight:800;">📦 Siparişi hazırla ve paketle</div>');
  tasks.push('<div style="background:#e6fffb;border:2px dashed #2dd4bf;border-radius:10px;padding:12px;color:#0f766e;font-weight:800;">🚚 Kargoya ver ve takip numarasını ilet</div>');

  return sectionCard({
    title: 'Yapılacaklar',
    emoji: '✅',
    body: `<div style="display:grid;gap:10px">${tasks.join('')}</div>`,
    accent: '#14b8a6'
  });
}