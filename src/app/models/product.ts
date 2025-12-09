export interface Product {
  id: number;
  shop_id?: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock_quantity?: number;
  sku?: string;
  created_at?: string;
  updated_at?: string;
}

export function slugify(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}
