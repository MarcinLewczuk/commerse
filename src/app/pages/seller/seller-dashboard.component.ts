import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ShopService } from '../../services/shop.service';
import { ProductsService } from '../../services/products.service';
import { Observable, switchMap } from 'rxjs';
import { Product } from '../../models/product';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">My Shop</h1>
        @if (shop$ | async; as shop) {
          <p class="text-gray-600">{{ shop.name }}</p>
        }
      </div>

      @if (products$ | async; as products) {
        @if (products.length === 0) {
          <div class="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p class="text-gray-600">No products yet. Start adding products to your shop!</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (product of products; track product.id) {
              <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                @if (product.image_url) {
                  <img 
                    [src]="product.image_url" 
                    [alt]="product.name"
                    class="w-full h-48 object-cover"
                  />
                } @else {
                  <div class="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span class="text-gray-400">No image</span>
                  </div>
                }
                
                <div class="p-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ product.name }}</h3>
                  
                  @if (product.description) {
                    <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ product.description }}</p>
                  }
                  
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-2xl font-bold text-gray-900">\${{ product.price }}</span>
                    <span class="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      Stock: {{ product.stock_quantity }}
                    </span>
                  </div>

                  @if (product.sku) {
                    <p class="text-xs text-gray-500 mb-3">SKU: {{ product.sku }}</p>
                  }

                  <div class="flex gap-2">
                    <button class="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md">
                      Edit
                    </button>
                    <button class="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-md">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <div class="text-center py-12">
          <p class="text-gray-600">Loading products...</p>
        </div>
      }
    </section>
  `
})
export class SellerDashboardComponent implements OnInit {
  private shopService = inject(ShopService);
  private productsService = inject(ProductsService);

  shop$!: Observable<any>;
  products$!: Observable<Product[]>;

  ngOnInit() {
    this.shop$ = this.shopService.getShopInfo();
    
    // Fetch products by getting shop info first, then fetching products for that shop
    this.products$ = this.shop$.pipe(
      switchMap(shop => {
        if (!shop?.id) {
          return new Observable<Product[]>(obs => obs.next([]));
        }
        return this.productsService.getByShopId(shop.id);
      })
    );
  }
}
