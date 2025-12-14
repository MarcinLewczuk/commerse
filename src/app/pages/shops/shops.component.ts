import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { slugify } from '../../models/product';

export interface ShopWithProducts {
  id: number;
  name: string;
  created_at: string;
  seller_picture?: string;
  seller_name?: string;
  products: {
    id: number;
    name: string;
    price: number;
    image_urls?: string | string[];
  }[];
}

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shops.component.html'
})
export class ShopsComponent implements OnInit {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  shops = signal<ShopWithProducts[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.fetchShops();
  }

  fetchShops() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<ShopWithProducts[]>(`${this.apiUrl}/shops`).subscribe({
      next: (data) => {
        const filteredShops = (Array.isArray(data) ? data : []).filter(shop => shop.products && shop.products.length > 0);
        this.shops.set(filteredShops);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load shops', err);
        this.error.set('Failed to load shops');
        this.loading.set(false);
      }
    });
  }

  getSellerName(shop: ShopWithProducts): string {
    return shop.seller_name || 'Seller';
  }

  getSellerPicture(shop: ShopWithProducts): string | null {
    return shop.seller_picture || null; 
  }

  displayPrice(price: number | undefined): string {
    if (price == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  getProductImage(imageUrls: string | string[] | undefined): string | null {
    if (!imageUrls) return null;
    try {
      let images: string[];
      if (typeof imageUrls === 'string') {
        // Handle comma-separated string from GROUP_CONCAT
        images = imageUrls.includes(',') 
          ? imageUrls.split(',')
          : [imageUrls];
      } else {
        images = Array.isArray(imageUrls) ? imageUrls : [];
      }
      return images.length > 0 ? images[0] : null;
    } catch (e) {
      return null;
    }
  }

  getAllProductImages(imageUrls: string | string[] | undefined): string[] {
    if (!imageUrls) return [];
    try {
      let images: string[];
      if (typeof imageUrls === 'string') {
        // Handle comma-separated string from GROUP_CONCAT
        images = imageUrls.includes(',') 
          ? imageUrls.split(',')
          : [imageUrls];
      } else {
        images = Array.isArray(imageUrls) ? imageUrls : [];
      }
      return images;
    } catch (e) {
      return [];
    }
  }

  slugify = slugify;
}