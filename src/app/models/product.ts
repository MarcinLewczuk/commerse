export interface Product {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  price: number;
  image_url: string;
  date_added?: string;
  last_updated?: string;
}

export function slugify(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}
