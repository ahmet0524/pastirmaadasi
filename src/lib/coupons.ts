// src/lib/coupons.ts
import { supabaseAdmin } from './supabase';

/**
 * Beklenen tablo yapısı (örnek):
 * coupons (
 *   id uuid | int,
 *   code text,
 *   discount_percent int,
 *   min_order_amount numeric,
 *   max_discount_amount numeric,
 *   usage_limit int,
 *   used_count int,
 *   valid_until timestamptz,
 *   is_active boolean,
 *   created_at timestamptz
 * )
 *
 * Eğer kendi schema'n farklıysa alan isimlerini eşle ya da bu helper'ları düzenle.
 */

export type Coupon = {
  id: any;
  code: string;
  discount_percent: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  used_count?: number | null;
  valid_until?: string | null; // ISO string
  is_active?: boolean;
  created_at?: string;
};

/** Tüm kuponları getir (aktif veya pasif farketmez) */
export async function getAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabaseAdmin
    .from<Coupon>('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAllCoupons error:', error);
    return [];
  }
  return data || [];
}

/** tek bir kuponu getir */
export async function getCouponById(id: string | number) {
  const { data, error } = await supabaseAdmin
    .from<Coupon>('coupons')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('getCouponById error:', error);
    return null;
  }
  return data;
}

/** Yeni kupon oluştur */
export async function createCoupon(payload: Partial<Coupon>) {
  const insert = {
    code: payload.code,
    discount_percent: payload.discount_percent ?? 0,
    min_order_amount: payload.min_order_amount ?? 0,
    max_discount_amount: payload.max_discount_amount ?? null,
    usage_limit: payload.usage_limit ?? null,
    used_count: payload.used_count ?? 0,
    valid_until: payload.valid_until ?? null,
    is_active: payload.is_active ?? true,
  };

  const { data, error } = await supabaseAdmin
    .from<Coupon>('coupons')
    .insert([insert])
    .select()
    .single();

  if (error) {
    console.error('createCoupon error:', error);
    throw error;
  }
  return data;
}

/** Kupon güncelle */
export async function updateCoupon(id: string | number, updates: Partial<Coupon>) {
  const { data, error } = await supabaseAdmin
    .from<Coupon>('coupons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateCoupon error:', error);
    throw error;
  }
  return data;
}

/** Kupon sil */
export async function deleteCoupon(id: string | number) {
  const { error } = await supabaseAdmin
    .from<Coupon>('coupons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteCoupon error:', error);
    throw error;
  }
  return true;
}

/** Kupon is_active toggle (pratik yardımcı) */
export async function toggleCouponActive(id: string | number, isActive: boolean) {
  const { data, error } = await supabaseAdmin
    .from<Coupon>('coupons')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('toggleCouponActive error:', error);
    throw error;
  }
  return data;
}
