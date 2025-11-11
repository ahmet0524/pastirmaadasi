// src/pages/api/test-order.js
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET({ request }) {
  try {
    console.log('🧪 Test başlıyor...');

    // 1. Basit bir insert dene
    const testData = {
      order_number: `TEST-${Date.now()}`,
      payment_id: `TEST-${Date.now()}`,
      customer_name: 'Test Kullanıcı',
      customer_email: 'test@test.com',
      customer_phone: '+905555555555',
      customer_address: 'Test Adres, Kayseri, Turkey',
      items: [{ name: 'Test Ürün', price: 100, quantity: 1 }],
      subtotal: 100,
      shipping_cost: 0,
      discount_amount: 0,
      total: 100,
      status: 'pending',
      payment_status: 'cash-on-delivery',
      payment_method: 'cash-on-delivery',
      notes: 'Test sipariş',
      created_at: new Date().toISOString()
    };

    console.log('📝 Test verisi:', JSON.stringify(testData, null, 2));

    const { data, error } = await supabase
      .from('orders')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('❌ Test hatası:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          details: error,
          hint: error.hint,
          code: error.code
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Test başarılı:', data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test başarılı!',
        data: data
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Test exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}