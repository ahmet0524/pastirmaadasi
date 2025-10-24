// src/pages/api/orders/update-tracking.js
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { orderId, trackingNumber, status } = body;

    if (!orderId || !trackingNumber) {
      return new Response(
        JSON.stringify({
          error: 'Sipariş ID ve takip numarası gerekli',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Sipariş güncelleniyor:', { orderId, trackingNumber, status });

    // Siparişi güncelle
    const { data, error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        status: status || 'shipped',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('❌ Supabase güncelleme hatası:', error);
      return new Response(
        JSON.stringify({
          error: 'Veritabanı güncellenemedi',
          details: error.message,
          success: false
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Sipariş güncellendi:', data);

    return new Response(
      JSON.stringify({
        success: true,
        data: data[0],
        message: 'Sipariş başarıyla güncellendi'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Update tracking hatası:', error);
    return new Response(
      JSON.stringify({
        error: 'İşlem başarısız',
        details: error.message,
        success: false
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}