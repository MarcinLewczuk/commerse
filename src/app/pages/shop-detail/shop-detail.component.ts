import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

export interface Product {
  id: number;
  shop_id: number;
  name: string;
  description?: string;
  price: number;
  image_urls?: string | string[];
  stock_quantity?: number;
  sku?: string;
}

export interface ShopDetail {
  id: number;
  name: string;
  created_at: string;
  products: Product[];
}

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-detail.component.html'
})
export class ShopDetailComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly apiUrl = 'http://localhost:3000';

  shop = signal<ShopDetail | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const shopId = this.route.snapshot.paramMap.get('id');
    if (!shopId) {
      this.error.set('Shop ID not found');
      this.loading.set(false);
      return;
    }
    this.fetchShopDetail(shopId);
  }

  fetchShopDetail(shopId: string) {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<ShopDetail>(`${this.apiUrl}/shops/${shopId}`).subscribe({
      next: (data) => {
        this.shop.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load shop', err);
        const status = err?.status;
        if (status === 404) {
          this.error.set('Shop not found');
        } else {
          this.error.set('Failed to load shop');
        }
        this.loading.set(false);
      }
    });
  }

  displayPrice(price: number): string {
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

  goBack() {
    this.router.navigate(['/shops']);
  }
}
