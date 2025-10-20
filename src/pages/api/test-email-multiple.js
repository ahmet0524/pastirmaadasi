// src/pages/api/test-email-multiple.js
import { Resend } from 'resend';

export async function POST({ request }) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email adresi gerekli' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    console.log(`📧 ${email} adresine test maili gönderiliyor...`);

    const result = await resend.emails.send({
      from: 'Pastırma Adası Test <onboarding@resend.dev>',
      to: email,
      subject: '🧪 Resend Test - ' + new Date().toLocaleTimeString('tr-TR'),
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f0f9ff; border-radius: 8px;">
          <h2 style="color: #0369a1;">✅ Test Maili Başarılı!</h2>
          <p style="color: #475569;">Bu mail <strong>${email}</strong> adresine gönderildi.</p>
          <p style="color: #475569;">Gönderim Zamanı: <strong>${new Date().toLocaleString('tr-TR')}</strong></p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 12px;">
            Eğer bu maili görüyorsanız, Resend entegrasyonunuz mükemmel çalışıyor! 🎉
          </p>
        </div>
      `,
    });

    console.log('📧 Resend API Response:', JSON.stringify(result, null, 2));
    console.log('📧 Data:', result.data);
    console.log('📧 Error:', result.error);
    console.log('📧 Full result:', result);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.data?.id || result.id,
        sentTo: email
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Mail gönderim hatası:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: 'POST request ile email parametresi gönderin',
      example: { email: 'test@example.com' }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}