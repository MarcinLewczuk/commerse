import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Service, slugify as slugifyService } from '../../models/service';
import { slugify as productSlugify } from '../../models/product';
import { BasketService } from '../../services/basket.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  private basketService = inject(BasketService);
  private snackBar = inject(MatSnackBar);
  private readonly apiUrl = 'http://localhost:3000';

  shop = signal<ShopDetail | null>(null);
  services = signal<Service[]>([]);
  loading = signal<boolean>(true);
  loadingServices = signal<boolean>(true);
  error = signal<string | null>(null);
  activeTab = signal<'products' | 'services'>('products');

  ngOnInit() {
    const shopId = this.route.snapshot.paramMap.get('id');
    if (!shopId) {
      this.error.set('Shop ID not found');
      this.loading.set(false);
      return;
    }
    this.fetchShopDetail(shopId);
    this.fetchServices(shopId);
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

  fetchServices(shopId: string) {
    this.loadingServices.set(true);
    this.http.get<Service[]>(`${this.apiUrl}/services/shop/${shopId}`).subscribe({
      next: (data) => {
        this.services.set(data);
        this.loadingServices.set(false);
      },
      error: (err) => {
        console.error('Failed to load services', err);
        this.loadingServices.set(false);
      }
    });
  }

  setActiveTab(tab: 'products' | 'services') {
    this.activeTab.set(tab);
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

  getServiceImage(service: Service): string | null {
    if (!service.image_urls) return null;
    try {
      let images: string[];
      if (typeof service.image_urls === 'string') {
        images = service.image_urls.includes(',') 
          ? service.image_urls.split(',')
          : [service.image_urls];
      } else {
        images = Array.isArray(service.image_urls) ? service.image_urls : [];
      }
      return images.length > 0 ? images[0] : null;
    } catch (e) {
      return null;
    }
  }

  slugifyService = slugifyService;

  slugifyProduct(productName: string): string {
    return productSlugify(productName);
  }

  addProductToBasket(event: Event, product: Product) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!product.stock_quantity || product.stock_quantity === 0) {
      this.snackBar.open('This product is out of stock', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
      return;
    }

    this.basketService.addItem('product', product, 1);
    this.snackBar.open('✓ Product added to basket!', 'View Basket', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    }).onAction().subscribe(() => {
      this.router.navigate(['/basket']);
    });
  }

  addServiceToBasket(event: Event, service: Service) {
    event.preventDefault();
    event.stopPropagation();
    
    this.basketService.addItem('service', service, 1);
    this.snackBar.open('✓ Service added to basket!', 'View Basket', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    }).onAction().subscribe(() => {
      this.router.navigate(['/basket']);
    });
  }

  navigateToProduct(productName: string) {
    this.router.navigate(['/products', this.slugifyProduct(productName)]);
  }

  goBack() {
    this.router.navigate(['/shops']);
  }
}
