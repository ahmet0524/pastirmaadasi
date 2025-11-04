// src/pages/api/sync-usage.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Supabase client'ı doğrudan burada oluştur
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const POST: APIRoute = async () => {
  try {
    // Tüm kuponları çek
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('*');

    if (couponsError) throw couponsError;

    // Her kupon için kullanım sayısını hesapla
    const updates = await Promise.all(
      (coupons || []).map(async (coupon) => {
        const { count, error } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_code', coupon.code);

        if (error) {
          console.error(`Error counting for ${coupon.code}:`, error);
          return null;
        }

        // Kupon kullanım sayısını güncelle
        const { error: updateError } = await supabase
          .from('coupons')
          .update({ used_count: count || 0 })
          .eq('id', coupon.id);

        if (updateError) {
          console.error(`Error updating ${coupon.code}:`, updateError);
          return null;
        }

        return { code: coupon.code, count: count || 0 };
      })
    );

    const successfulUpdates = updates.filter(u => u !== null);

    return new Response(
      JSON.stringify({
        success: true,
        totalCoupons: coupons?.length || 0,
        updated: successfulUpdates.length,
        results: successfulUpdates
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};