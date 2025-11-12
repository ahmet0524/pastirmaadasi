import {
  headerBlock,
  sectionCard,
  keyValueRow,
  itemsTable,
  totalBlock,
  bankTransferBlock,
  codBlock,
  nextStepsBlock,
  footer,
  currencyTRY
} from '../../lib/email-templates.js'; // ✅ DÜZELTME: ../lib/ → ../../lib/

// Mail HTML'ini şöyle oluştur:
const header = headerBlock({
  title: paymentMethod === 'bank-transfer' ? 'Havale/EFT Bilgileri' : 'Kapıda Ödeme Siparişi',
  icon: paymentMethod === 'bank-transfer' ? '🏦' : '💵',
  gradient: paymentMethod === 'bank-transfer'
    ? 'linear-gradient(135deg,#38bdf8,#0ea5e9)'
    : 'linear-gradient(135deg,#f59e0b,#d97706)'
});

const orderInfo = sectionCard({
  title: 'Sipariş Özeti',
  emoji: '📋',
  body: `
    ${keyValueRow('Sipariş No', `<code style="background:#fff7ed;padding:6px 10px;border-radius:10px;color:#b45309;font-weight:900">${orderNumber}</code>`)}
    ${keyValueRow('Telefon', fullPhone)}
    ${keyValueRow('Teslimat Adresi', shippingAddr)}
    ${keyValueRow('Ödeme Yöntemi', paymentMethod === 'bank-transfer' ? '🏦 Havale/EFT' : '💵 Kapıda Ödeme', true)}
  `
});

const products = sectionCard({
  title: 'Sipariş İçeriği',
  emoji: '🛒',
  body: itemsTable(items),
  accent: '#0ea5e9'
});

const paymentInstructions = paymentMethod === 'bank-transfer'
  ? bankTransferBlock({
      orderNumber,
      total,
      bankDetails: {
        bankName: 'Türkiye İş Bankası',
        accountHolder: 'PASTIRMA ADASI GIDA SAN. TİC. LTD. ŞTİ.',
        iban: 'TR33 0006 4000 0011 2345 6789 01'
      }
    })
  : codBlock();

const html = `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"/></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,sans-serif;">
    <div style="max-width:680px;margin:0 auto;padding:20px">
      <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(2,6,23,0.12);">
        ${header}
        <div style="padding:20px">
          ${orderInfo}
          ${products}
          ${totalBlock(total)}
          ${paymentInstructions}
          ${nextStepsBlock(paymentMethod)}
        </div>
        ${footer()}
      </div>
    </div>
  </body></html>
`;

// Export veya kullanım
export { html };