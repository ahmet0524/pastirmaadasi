// src/lib/products.ts

// Tek ürün getir (slug ile)
export async function getProductBySlug(slug: string) {
  return {
    id: 1,
    slug,
    name: "Demo Ürün",
    description: "Bu sadece sahte bir ürün açıklamasıdır.",
    price: 100,
    image: "/images/demo-product.jpg"
  };
}

// Tüm ürünleri getir
export async function getProducts() {
  return [
    {
      id: 1,
      slug: "demo-urun",
      name: "Demo Ürün",
      description: "Bu sadece sahte bir ürün açıklamasıdır.",
      price: 100,
      image: "/images/demo-product.jpg"
    },
    {
      id: 2,
      slug: "ikinci-urun",
      name: "İkinci Ürün",
      description: "İkinci demo ürün açıklaması.",
      price: 200,
      image: "/images/demo-product2.jpg"
    }
  ];
}
