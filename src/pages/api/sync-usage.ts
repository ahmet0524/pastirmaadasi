// src/pages/api/sync-usage.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Auth kontrolü
    const session = cookies.get('sb-access-token');
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Supabase Admin Client
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Tüm siparişleri çek
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('coupon_codes, coupon_code');

    if (ordersError) {
      throw new Error(`Orders fetch error: ${ordersError.message}`);
    }

    // 2️⃣ Kupon kullanım sayılarını hesapla
    const couponUsageMap = new Map<string, number>();

    orders?.forEach((order: any) => {
      // Yeni format: coupon_codes array
      if (order.coupon_codes) {
        let codes: string[] = [];

        // Array ise direkt kullan
        if (Array.isArray(order.coupon_codes)) {
          codes = order.coupon_codes;
        }
        // String ise parse et
        else if (typeof order.coupon_codes === 'string') {
          try {
            const parsed = JSON.parse(order.coupon_codes);
            codes = Array.isArray(parsed) ? parsed : [];
          } catch {
            codes = [];
          }
        }

        codes.forEach((code: string) => {
          couponUsageMap.set(code, (couponUsageMap.get(code) || 0) + 1);
        });
      }

      // Eski format: coupon_code (tekil) - backward compatibility
      else if (order.coupon_code && typeof order.coupon_code === 'string') {
        couponUsageMap.set(
          order.coupon_code,
          (couponUsageMap.get(order.coupon_code) || 0) + 1
        );
      }
    });

    // 3️⃣ Tüm kuponları çek
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('id, code, used_count');

    if (couponsError) {
      throw new Error(`Coupons fetch error: ${couponsError.message}`);
    }

    // 4️⃣ Her kuponu güncelle
    const updatePromises = coupons?.map(async (coupon: any) => {
      const actualUsage = couponUsageMap.get(coupon.code) || 0;

      // Eğer used_count farklıysa güncelle
      if (coupon.used_count !== actualUsage) {
        const { error: updateError } = await supabase
          .from('coupons')
          .update({ used_count: actualUsage })
          .eq('id', coupon.id);

        if (updateError) {
          console.error(`❌ Coupon ${coupon.code} update error:`, updateError);
          return { code: coupon.code, success: false, error: updateError.message };
        }

        return {
          code: coupon.code,
          success: true,
          oldCount: coupon.used_count,
          newCount: actualUsage
        };
      }

      return { code: coupon.code, success: true, unchanged: true };
    }) || [];

    const results = await Promise.all(updatePromises);

    // 5️⃣ Sonuçları özetle
    const summary = {
      totalCoupons: coupons?.length || 0,
      updated: results.filter(r => r.success && !r.unchanged).length,
      unchanged: results.filter(r => r.unchanged).length,
      failed: results.filter(r => !r.success).length,
      details: results.filter(r => r.success && !r.unchanged)
    };

    console.log('✅ Sync completed:', summary);

    return new Response(JSON.stringify({
      success: true,
      message: `${summary.updated} kupon güncellendi, ${summary.unchanged} değişiklik yok`,
      summary
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Sync usage error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Senkronizasyon başarısız'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};