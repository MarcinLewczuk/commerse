export interface Service {
  id: number;
  shop_id?: number;
  name: string;
  description?: string;
  price: number;
  duration_minutes?: number;
  service_code?: string;
  image_urls?: string | string[];
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

export function generateServiceCode(serviceName: string, shopId: number): string {
  // Generate a service code like: SRV-SHOPID-SERVICENAME-RANDOM
  const cleanName = serviceName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);
  const timestamp = Date.now().toString().slice(-4);
  return `SRV-${shopId}-${cleanName}-${timestamp}`;
}
