// src/lib/imageParser.ts
// Supabase'den gelen resim verisini güvenli şekilde parse eder

export function parseImageUrl(imgs: any): string {
  const placeholder = '/assets/image/placeholder.jpg';

  console.log('🔍 Parse Input:', { imgs, type: typeof imgs });

  if (!imgs) {
    console.log('❌ No image data');
    return placeholder;
  }

  // 1. Array ise
  if (Array.isArray(imgs)) {
    if (imgs.length === 0) return placeholder;
    const firstImage = String(imgs[0])
      .replace(/^"+|"+$/g, '')  // Başta ve sondaki tüm tırnakları kaldır
      .replace(/\\"/g, '"')      // Escaped quotes'ları düzelt
      .trim();
    console.log('✅ Array parsed:', firstImage);
    return firstImage || placeholder;
  }

  // 2. String ise
  if (typeof imgs === 'string') {
    // Boş string kontrolü
    if (imgs.trim() === '') return placeholder;

    // PostgreSQL array format: {path1,path2}
    if (imgs.startsWith('{') && imgs.endsWith('}')) {
      console.log('📦 PostgreSQL array format detected');
      const paths = imgs
        .slice(1, -1)
        .split(',')
        .map(p => p
          .trim()
          .replace(/^"+|"+$/g, '')
          .replace(/\\"/g, '"')
        )
        .filter(p => p.length > 0);

      console.log('✅ PostgreSQL parsed:', paths);
      return paths.length > 0 ? paths[0] : placeholder;
    }

    // JSON array format: ["path1"] or [""path1""]
    if (imgs.startsWith('[')) {
      console.log('📋 JSON array format detected');
      try {
        // Çift tırnakları temizle
        let cleaned = imgs
          .replace(/""+/g, '"')      // Çift tırnakları tekle
          .replace(/\\"/g, '"')       // Escaped quotes
          .replace(/\s+/g, ' ');      // Fazla boşlukları temizle

        console.log('🧹 Cleaned JSON string:', cleaned);

        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstImage = String(parsed[0])
            .replace(/^"+|"+$/g, '')
            .trim();
          console.log('✅ JSON parsed:', firstImage);
          return firstImage || placeholder;
        }
      } catch (e) {
        console.error('❌ JSON parse error:', e);
        console.error('Failed string:', imgs);

        // Fallback: Manuel parse
        const match = imgs.match(/\/assets\/image\/products\/[^"',\]]+\.webp/);
        if (match) {
          console.log('🔧 Fallback regex match:', match[0]);
          return match[0];
        }
      }
    }

    // Direct URL string
    const cleaned = imgs
      .replace(/^"+|"+$/g, '')
      .replace(/\\"/g, '"')
      .trim();

    if (cleaned.startsWith('/') || cleaned.startsWith('http')) {
      console.log('✅ Direct URL:', cleaned);
      return cleaned;
    }

    // Son çare: Regex ile path bul
    const pathMatch = imgs.match(/\/assets\/image\/products\/[^"',\]]+\.webp/);
    if (pathMatch) {
      console.log('🔧 Regex fallback:', pathMatch[0]);
      return pathMatch[0];
    }
  }

  console.log('❌ Unknown format, returning placeholder');
  return placeholder;
}

export function parseImageArray(imgs: any): string[] {
  const placeholder = '/assets/image/placeholder.jpg';

  console.log('🔍 Parse Array Input:', { imgs, type: typeof imgs });

  if (!imgs) {
    return [placeholder];
  }

  // 1. Already array
  if (Array.isArray(imgs)) {
    const cleaned = imgs
      .map(img => String(img)
        .replace(/^"+|"+$/g, '')
        .replace(/\\"/g, '"')
        .trim()
      )
      .filter(img => img.length > 0);

    console.log('✅ Array cleaned:', cleaned);
    return cleaned.length > 0 ? cleaned : [placeholder];
  }

  // 2. String
  if (typeof imgs === 'string') {
    if (imgs.trim() === '') return [placeholder];

    // PostgreSQL array: {path1,path2}
    if (imgs.startsWith('{') && imgs.endsWith('}')) {
      const paths = imgs
        .slice(1, -1)
        .split(',')
        .map(p => p
          .trim()
          .replace(/^"+|"+$/g, '')
          .replace(/\\"/g, '"')
        )
        .filter(p => p.length > 0);

      console.log('✅ PostgreSQL array:', paths);
      return paths.length > 0 ? paths : [placeholder];
    }

    // JSON array
    if (imgs.startsWith('[')) {
      try {
        let cleaned = imgs
          .replace(/""+/g, '"')
          .replace(/\\"/g, '"')
          .replace(/\s+/g, ' ');

        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed)) {
          const cleanedPaths = parsed
            .map(p => String(p)
              .replace(/^"+|"+$/g, '')
              .trim()
            )
            .filter(p => p.length > 0);

          console.log('✅ JSON array:', cleanedPaths);
          return cleanedPaths.length > 0 ? cleanedPaths : [placeholder];
        }
      } catch (e) {
        console.error('❌ JSON parse error:', e);

        // Fallback: Regex ile tüm path'leri bul
        const matches = imgs.match(/\/assets\/image\/products\/[^"',\]]+\.webp/g);
        if (matches && matches.length > 0) {
          console.log('🔧 Regex fallback array:', matches);
          return matches;
        }
      }
    }

    // Single URL
    const cleaned = imgs
      .replace(/^"+|"+$/g, '')
      .replace(/\\"/g, '"')
      .trim();

    if (cleaned.startsWith('/') || cleaned.startsWith('http')) {
      return [cleaned];
    }
  }

  return [placeholder];
}