// src/pages/api/create-cash-order.js - GÜNCEL VERSİYON
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const prerender = false;

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('📦 Kapıda ödeme isteği alındı');

    const {
      customerName,
      customerEmail,
      customerPhone,
      customerIdentity,
      customerAddress,
      customerCity,
      items,
      subtotal,
      shipping,
      total,
      invoiceType,
      companyName,
      taxOffice,
      taxNumber,
      orderNote,
      appliedCoupons,
      billingAddress,
      billingCity,
      isDifferentBilling,
      paymentMethod // 'cash-on-delivery' veya 'bank-transfer'
    } = body;

    const orderNumber = `ORD-${Date.now()}`;
    const fullPhone = `+90${customerPhone}`;
    const shippingAddr = `${customerAddress}, ${customerCity}, Turkey`;
    const billingAddr = isDifferentBilling
      ? `${billingAddress}, ${billingCity}, Turkey`
      : shippingAddr;

    // Kupon bilgileri
    let couponCodes = [];
    let totalDiscountAmount = 0;
    if (appliedCoupons && Array.isArray(appliedCoupons)) {
      couponCodes = appliedCoupons.map(c => c.code);
      totalDiscountAmount = appliedCoupons.reduce((sum, c) => sum + (c.discountAmount || 0), 0);
    }

    // Sipariş verisi
    const orderData = {
      order_number: orderNumber,
      payment_id: orderNumber,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: fullPhone,
      customer_address: shippingAddr,
      items: items,
      subtotal: subtotal || 0,
      shipping_cost: shipping || 0,
      discount_amount: totalDiscountAmount,
      total: total,
      status: 'pending',
      payment_status: paymentMethod === 'bank-transfer' ? 'awaiting-payment' : 'cash-on-delivery',
      notes: `${paymentMethod === 'bank-transfer' ? 'Havale/EFT' : 'Kapıda Ödeme'}${customerIdentity ? ` | TC: ${customerIdentity}` : ''}${orderNote ? ` | Not: ${orderNote}` : ''}`,
      created_at: new Date().toISOString()
    };

    // Opsiyonel alanlar
    if (invoiceType) orderData.invoice_type = invoiceType;
    if (companyName) orderData.company_name = companyName;
    if (taxOffice) orderData.tax_office = taxOffice;
    if (taxNumber) orderData.tax_number = taxNumber;
    if (isDifferentBilling) {
      orderData.billing_address = billingAddr;
      orderData.is_different_billing = true;
    }
    if (couponCodes.length > 0) {
      orderData.coupon_code = couponCodes[0];
      orderData.total_discount = totalDiscountAmount;
    }

    console.log('📝 Kaydedilecek veri:', orderData);

    // Veritabanına kaydet
    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      console.error('❌ DB Hatası:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          details: error.hint || error.details
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Sipariş kaydedildi:', orderNumber);

    // Email içeriği - ürün listesi
    const itemsHTML = items.map((item, index) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}. ${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.unit || '500gr'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${parseFloat(item.price).toFixed(2)}₺</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: #059669;">${(parseFloat(item.price) * item.quantity).toFixed(2)}₺</td>
      </tr>
    `).join('');

    const paymentMethodText = paymentMethod === 'bank-transfer'
      ? '🏦 Havale/EFT ile Ödeme'
      : '💵 Kapıda Ödeme';

    const paymentInstructions = paymentMethod === 'bank-transfer' ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <strong style="color: #92400e; display: block; margin-bottom: 10px; font-size: 18px;">🏦 Havale Bilgileri</strong>
        <p style="margin: 10px 0 5px 0; color: #78350f; font-size: 15px;"><strong>Banka:</strong> Türkiye İş Bankası</p>
        <p style="margin: 5px 0; color: #78350f; font-size: 15px;"><strong>Hesap Sahibi:</strong> PASTIRMA ADASI GIDA SAN. TİC. LTD. ŞTİ.</p>
        <p style="margin: 5px 0; color: #78350f; font-size: 15px;"><strong>IBAN:</strong> TR33 0006 4000 0011 2345 6789 01</p>
        <p style="margin: 5px 0; color: #78350f; font-size: 15px;"><strong>Tutar:</strong> ${total.toFixed(2)}₺</p>
        <p style="margin: 15px 0 0 0; color: #92400e; font-size: 14px; font-weight: 600;">⚠️ Havale açıklamasına mutlaka sipariş numaranızı yazınız: <strong>${orderNumber}</strong></p>
      </div>
    ` : `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <strong style="color: #92400e; display: block; margin-bottom: 8px; font-size: 16px;">⚠️ Önemli Bilgi</strong>
        <p style="margin: 0; color: #78350f;">Ödemeyi teslimat sırasında <strong>nakit</strong> veya <strong>kredi kartı</strong> ile yapabilirsiniz.</p>
      </div>
    `;

    // Müşteriye email
    try {
      await resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: customerEmail,
        subject: `✅ Siparişiniz Alındı - ${orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff;">
              <div style="background: linear-gradient(135deg, #c41e3a 0%, #a01729 100%); color: white; padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 800;">🎉 Siparişiniz Alındı!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Siparişiniz başarıyla kaydedildi</p>
              </div>

              <div style="background: #f9f9f9; padding: 30px 20px;">
                <p style="font-size: 18px; margin-bottom: 20px;">Merhaba <strong>${customerName}</strong>,</p>
                <p style="margin-bottom: 30px;">Pastırma Adası'nı tercih ettiğiniz için teşekkür ederiz!</p>

                <div style="background: white; padding: 25px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #0891B2;">
                  <h3 style="color: #0891B2; margin-top: 0; margin-bottom: 15px; font-size: 20px;">📋 Sipariş Bilgileri</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; font-weight: 600; color: #666;">Sipariş No:</td>
                      <td style="padding: 12px 0; text-align: right; color: #333;"><strong>${orderNumber}</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; font-weight: 600; color: #666;">Telefon:</td>
                      <td style="padding: 12px 0; text-align: right; color: #333;">${fullPhone}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; font-weight: 600; color: #666;">Teslimat Adresi:</td>
                      <td style="padding: 12px 0; text-align: right; color: #333; max-width: 300px;">${shippingAddr}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: 600; color: #666;">Ödeme Yöntemi:</td>
                      <td style="padding: 12px 0; text-align: right; color: #333;"><strong>${paymentMethodText}</strong></td>
                    </tr>
                  </table>
                </div>

                <div style="background: white; padding: 25px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                  <h4 style="margin-top: 0; margin-bottom: 20px; color: #333; font-size: 18px;">🛒 Sipariş İçeriği</h4>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; font-size: 14px; color: #4b5563;">Ürün</th>
                        <th style="padding: 12px; text-align: center; font-size: 14px; color: #4b5563;">Adet</th>
                        <th style="padding: 12px; text-align: center; font-size: 14px; color: #4b5563;">Gramaj</th>
                        <th style="padding: 12px; text-align: right; font-size: 14px; color: #4b5563;">Birim Fiyat</th>
                        <th style="padding: 12px; text-align: right; font-size: 14px; color: #4b5563;">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHTML}
                    </tbody>
                  </table>
                </div>

                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; margin: 20px 0; border-radius: 12px; text-align: center; border: 2px solid #059669;">
                  <div style="font-size: 18px; color: #333; margin-bottom: 10px;">Toplam Tutar</div>
                  <div style="font-size: 36px; font-weight: 800; color: #c41e3a;">${total.toFixed(2)}₺</div>
                </div>

                ${paymentInstructions}

                <p style="margin-top: 30px; text-align: center; font-size: 18px; color: #059669;">Afiyet olsun! 🙏</p>
              </div>

              <div style="text-align: center; padding: 30px 20px; color: #666; font-size: 14px; background: white; border-top: 1px solid #e5e7eb;">
                <p><strong style="color: #0891B2; font-size: 16px;">Pastırma Adası</strong></p>
                <p style="font-size: 13px; color: #999; margin-top: 10px;">Kayseri'nin geleneksel lezzeti</p>
                <p style="margin-top: 15px;">
                  <a href="https://www.pastirmaadasi.com" style="color: #0891B2; text-decoration: none; font-weight: 600;">www.pastirmaadasi.com</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      // Admin'e email
      const adminEmail = import.meta.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com';
      await resend.emails.send({
        from: 'Pastırma Adası <siparis@successodysseyhub.com>',
        to: adminEmail,
        subject: `🔔 YENİ SİPARİŞ (${paymentMethodText}) - ${customerName} (${total}₺)`,
        html: `
          <h2>🔔 Yeni Sipariş Alındı!</h2>
          <h3>👤 Müşteri Bilgileri</h3>
          <ul>
            <li><strong>Ad Soyad:</strong> ${customerName}</li>
            <li><strong>Email:</strong> ${customerEmail}</li>
            <li><strong>Telefon:</strong> ${fullPhone}</li>
          </ul>
          <h3>📦 Sipariş Bilgileri</h3>
          <ul>
            <li><strong>Sipariş No:</strong> ${orderNumber}</li>
            <li><strong>Ara Toplam:</strong> ${subtotal.toFixed(2)}₺</li>
            <li><strong>Kargo:</strong> ${shipping.toFixed(2)}₺</li>
            ${totalDiscountAmount > 0 ? `<li><strong>İndirim:</strong> -${totalDiscountAmount.toFixed(2)}₺</li>` : ''}
            <li><strong>Toplam:</strong> ${total.toFixed(2)}₺</li>
            <li><strong>Ödeme:</strong> ${paymentMethodText}</li>
            ${orderNote ? `<li><strong>Not:</strong> ${orderNote}</li>` : ''}
          </ul>
          <h3>🛒 Ürünler</h3>
          <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th>Ürün</th>
                <th>Adet</th>
                <th>Gramaj</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr>
                  <td>${i + 1}. ${item.name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: center;">${item.unit || '500gr'}</td>
                  <td style="text-align: right;">${parseFloat(item.price).toFixed(2)}₺</td>
                  <td style="text-align: right;"><strong>${(parseFloat(item.price) * item.quantity).toFixed(2)}₺</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h3>📍 Teslimat Adresi</h3>
          <p>${shippingAddr}</p>
          ${paymentMethod === 'bank-transfer' ? '<p style="background: #fef3c7; padding: 15px; border-radius: 8px;"><strong>⚠️ Bu sipariş havale/EFT ile ödenecektir! Ödeme onayını bekleyin.</strong></p>' : '<p><strong>⚠️ Bu sipariş kapıda ödenecektir!</strong></p>'}
        `,
        replyTo: customerEmail
      });

      console.log('✅ Emailler gönderildi');
    } catch (emailError) {
      console.error('⚠️ Email hatası:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNumber: orderNumber
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Genel hata:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}