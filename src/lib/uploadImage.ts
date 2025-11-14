// src/lib/uploadImage.ts
import { supabase } from './supabase';

export async function uploadProductImage(file: File): Promise<string | null> {
  try {
    // Dosya adını benzersiz yap
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    console.log('📤 Resim yükleniyor:', fileName);

    // Supabase Storage'a yükle
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload hatası:', error);
      throw error;
    }

    // Public URL al
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log('✅ Resim yüklendi:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('💥 Resim yükleme hatası:', error);
    return null;
  }
}

// Resmi sil
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  try {
    // URL'den dosya yolunu çıkar
    const urlParts = imageUrl.split('/product-images/');
    if (urlParts.length !== 2) return false;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) throw error;

    console.log('🗑️ Resim silindi:', filePath);
    return true;
  } catch (error) {
    console.error('❌ Resim silme hatası:', error);
    return false;
  }
}