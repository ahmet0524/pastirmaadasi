/* ========================================
   README.md
   ======================================== */

# Pastırma Adası E-Ticaret Sitesi

Kayseri'nin geleneksel lezzetlerini modern bir e-ticaret deneyimiyle sunan web sitesi.

## 🚀 Özellikler

- ✅ Astro 4.x ile geliştirilmiş modern, hızlı statik site
- ✅ Tailwind CSS ile responsive tasarım
- ✅ Mobile-first yaklaşım (%90 mobil kullanıcı odaklı)
- ✅ SEO optimize edilmiş
- ✅ Lazy loading ve defer ile performans optimizasyonu
- ✅ İki ana bölüm: Online Alışveriş ve Kayseri Sofrası
- ✅ Sepet sistemi (localStorage ile)
- ✅ Ürün kategorileri ve filtreleme
- ✅ WhatsApp entegrasyonu
- ✅ Consent popup
- ✅ İyzico ödeme sistemi hazır altyapı
- ✅ Netlify Forms ile rezervasyon sistemi
- ✅ Güvenli ödeme ikonları

## 📦 Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Production build
npm run build

# Build önizlemesi
npm run preview
```

## 📁 Proje Yapısı

```
pastirma-adasi/
├── public/
│   └── assets/
│       └── image/
│           ├── products/      # Ürün görselleri
│           ├── banners/       # Banner görselleri
│           └── icons/         # İkonlar
├── src/
│   ├── components/            # Yeniden kullanılabilir bileşenler
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ProductCard.astro
│   │   └── ConsentPopup.astro
│   ├── layouts/               # Sayfa layout'ları
│   │   └── BaseLayout.astro
│   ├── pages/                 # Sayfa dosyaları
│   │   ├── index.astro
│   │   ├── online-alisveris.astro
│   │   ├── kayseri-sofrasi.astro
│   │   ├── sepet.astro
│   │   └── products/
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## 🎨 Tasarım Sistemi

### Renkler
- Primary: `#7a6a35` (Koyu altın)
- Secondary: `#d4af37` (Altın sarısı)
- Accent: `#f2e6c9` (Açık bej)

### Tipografi
- Font: Georgia (serif)
- Başlıklar: Bold
- Gövde metni: Regular

## 🛠️ Kullanılan Teknolojiler

- **Framework:** Astro 4.x
- **Styling:** Tailwind CSS 3.x
- **SEO:** @astrojs/sitemap
- **Deployment:** Netlify
- **Ödeme:** İyzico (entegrasyon hazır)
- **Forms:** Netlify Forms

## 📱 Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🚀 Netlify Deployment

1. GitHub'a projeyi push edin
2. Netlify'da yeni site oluşturun
3. Build komutunu ayarlayın: `npm run build`
4. Publish dizini: `dist`
5. Deploy edin!

### Netlify Ayarları

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 📋 Yapılacaklar Listesi

- [ ] Ürün veri tabanı entegrasyonu
- [ ] İyzico ödeme gateway entegrasyonu
- [ ] Admin paneli geliştirme
- [ ] Ürün arama fonksiyonu
- [ ] Ürün filtreleme sistemi
- [ ] Kullanıcı hesap sistemi
- [ ] Sipariş takip sistemi
- [ ] E-posta bildirimleri
- [ ] SMS bildirimleri
- [ ] Stok yönetimi

## 📝 Önemli Notlar

### Görseller
- Tüm görseller `public/assets/image/` klasöründe olmalı
- Lazy loading aktif
- WebP formatı önerilir
- Optimum boyut: 1200x800px (ürünler için)

### SEO
- Her sayfada unique title ve description
- Sitemap otomatik oluşturulur
- robots.txt hazır
- Open Graph meta tagları mevcut

### Performans
- Lazy loading tüm görsellerde aktif
- Script'ler defer ile yüklenir
- Tailwind CSS purge aktif
- Astro'nun built-in optimizasyonları

## 🔐 Güvenlik

- HTTPS zorunlu (Netlify otomatik sağlar)
- KVKK uyumlu gizlilik politikası
- Çerez onay sistemi
- Güvenli ödeme altyapısı

## 📞 İletişim

- **Telefon:** 0507 762 38 38
- **E-posta:** pastirmaadasi@gmail.com
- **Adres:** Tablakaya, Yeni Bağlar Cd. No:17/A, 38200 Talas/Kayseri

## 📄 Lisans

Bu proje Pastırma Adası için özel olarak geliştirilmiştir.

---

**Not:** Bu proje production'a almadan önce:
1. Gerçek ürün verilerini ekleyin
2. Tüm görselleri yükleyin
3. İyzico API anahtarlarını ayarlayın
4. Google Analytics ekleyin
5. Netlify Forms'u test edin
6. Tüm linkleri kontrol edin
7. Mobil cihazlarda test edin