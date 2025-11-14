import { supabaseAdmin } from '../../lib/supabase';
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
} from '../../lib/email-templates.js';

export async function POST({ request }) {
  try {
    // ✅ İsteği parse et
    const body = await request.json();
    const { items, total, customerInfo, paymentMethod = 'cod' } = body;

    console.log('📦 Sipariş İsteği:', { items, total, customerInfo, paymentMethod });

    // ✅ Validasyon
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Sepette ürün yok!' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      return new Response(
        JSON.stringify({ error: 'Müşteri bilgileri eksik!' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Sipariş numarası oluştur
    const orderNumber = `PA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // ✅ Telefon formatlama
    const fullPhone = customerInfo.phone.startsWith('+90')
      ? customerInfo.phone
      : `+90${customerInfo.phone.replace(/\D/g, '')}`;

    // ✅ Adres formatlama
    const shippingAddr = `${customerInfo.address}, ${customerInfo.city || ''} ${customerInfo.district || ''}`.trim();

    // ✅ Supabase'e kaydet
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: customerInfo.name,
        customer_phone: fullPhone,
        customer_email: customerInfo.email || null,
        shipping_address: shippingAddr,
        items: items,
        total: parseFloat(total),
        payment_method: paymentMethod,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Supabase Error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Sipariş kaydedilemedi: ' + orderError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Sipariş kaydedildi:', order);

    // ✅ Mail HTML'i oluştur
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
        ${keyValueRow('Müşteri', customerInfo.name)}
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

    // ✅ Mail gönderme (opsiyonel - eğer Resend API'niz varsa)
    // Şimdilik mail göndermiyoruz, sadece HTML'i logluyoruz
    console.log('📧 Mail HTML hazır (gönderilmedi)');

    // ✅ Başarılı yanıt döndür
    return new Response(
      JSON.stringify({
        success: true,
        orderNumber,
        orderId: order.id,
        message: 'Siparişiniz başarıyla alındı!',
        paymentMethod
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ API Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Sipariş oluşturulamadı',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}