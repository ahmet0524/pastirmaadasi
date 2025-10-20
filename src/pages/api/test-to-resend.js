// src/pages/api/test-to-resend.js
import { Resend } from 'resend';

export async function GET() {
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    console.log('📧 Resend test adresine mail gönderiliyor...');

    // 1. Resend'in test adresine gönder
    const test1 = await resend.emails.send({
      from: 'Pastırma Adası <siparis@successodysseyhub.com>', // ✅ Doğrulanmış domain
      to: 'delivered@resend.dev', // Resend'in her zaman çalışan adresi
      subject: '✅ Test 1: Resend Test Adresi',
      html: '<h2>Bu Resend test adresine gönderildi</h2>',
    });

    console.log('✅ Test 1 (Resend):', test1);

    // 2. Gmail'e gönder
    const test2 = await resend.emails.send({
      from: 'Pastırma Adası <siparis@successodysseyhub.com>', // ✅ Doğrulanmış domain
      to: 'successodysseyhub@gmail.com',
      subject: '✅ Test 2: Gmail Adresi',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f0f9ff; border-radius: 8px;">
          <h2 style="color: #0369a1;">🎉 Gmail Test</h2>
          <p>Bu mail Gmail adresinize gönderildi.</p>
          <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          <p style="color: #dc2626; font-weight: bold;">Spam klasörünü kontrol edin!</p>
        </div>
      `,
    });

    console.log('✅ Test 2 (Gmail):', test2);

    return new Response(
      JSON.stringify({
        success: true,
        test1: {
          to: 'delivered@resend.dev',
          messageId: test1.data?.id,
          error: test1.error
        },
        test2: {
          to: 'successodysseyhub@gmail.com',
          messageId: test2.data?.id,
          error: test2.error
        },
        message: 'Her iki mail de gönderildi. Resend Dashboard ve Gmail kutunuzu kontrol edin.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Hata:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}