// src/lib/products.ts
export async function getProduct(slug: string) {
  // Geçici sahte ürün
  return {
    id: 1,
    slug,
    name: "Demo Ürün",
    description: "Bu sadece sahte bir ürün açıklamasıdır.",
    price: 100,
  };
}
