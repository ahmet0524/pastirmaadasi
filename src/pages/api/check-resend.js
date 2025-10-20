// src/pages/api/check-resend.js
import { Resend } from 'resend';

export async function GET() {
  try {
    const apiKey = import.meta.env.RESEND_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'RESEND_API_KEY bulunamadı',
          hasKey: false
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(apiKey);

    // Basit bir API çağrısı yap (domains listesi vs.)
    let apiTest = null;
    try {
      // Resend API'sine ping at
      const testEmail = await resend.emails.send({
        from: 'Test <onboarding@resend.dev>',
        to: 'delivered@resend.dev', // Resend'in test adresi
        subject: 'API Test',
        html: '<p>Test</p>',
      });
      apiTest = { success: true, data: testEmail };
    } catch (apiError) {
      apiTest = { success: false, error: apiError.message };
    }

    return new Response(
      JSON.stringify({
        hasKey: true,
        keyPrefix: apiKey.substring(0, 10) + '...',
        keyLength: apiKey.length,
        startsWithRe: apiKey.startsWith('re_'),
        resendVersion: '3.x', // Resend paketi version
        apiTest: apiTest
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
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