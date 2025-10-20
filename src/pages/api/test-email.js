// src/pages/api/test-email.js
// Bu dosyayı oluşturun ve /api/test-email endpoint'ini test edin

import { Resend } from 'resend';

export async function GET() {
  try {
    console.log('📧 Test mail gönderimi başlatılıyor...');

    // API Key kontrolü
    const apiKey = import.meta.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY bulunamadı!');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RESEND_API_KEY tanımlı değil'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ API Key bulundu:', apiKey.substring(0, 10) + '...');

    const resend = new Resend(apiKey);

    // Test maili gönder
    const result = await resend.emails.send({
      from: 'Pastırma Adası <onboarding@resend.dev>', // Resend'in test maili
      to: 'successodysseyhub@gmail.com', // ⚠️ BURAYA KENDİ MAİLİNİZİ YAZIN
      subject: '🧪 Resend Test Maili',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Resend Çalışıyor!</h2>
          <p>Bu bir test mailidir.</p>
          <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          <hr/>
          <p style="color: #666; font-size: 12px;">
            Eğer bu maili alıyorsanız, Resend entegrasyonunuz çalışıyor demektir.
          </p>
        </div>
      `,
    });

    console.log('✅ Mail gönderildi!', result);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.data?.id || result.id || 'unknown',
        data: result.data || result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Test mail hatası:', error);
    console.error('Hata detayı:', {
      message: error.message,
      name: error.name,
      response: error.response?.data || 'Yok'
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.response?.data || null
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function POST() {
  return GET(); // POST isteklerini de destekle
}