import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShopService } from '../../services/shop.service';
import { ProductsService } from '../../services/products.service';
import { Observable, switchMap } from 'rxjs';
import { Product } from '../../models/product';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink],
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
                    <a [routerLink]="['/seller/products', product.id, 'edit']" class="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md text-center">
                      Edit
                    </a>
                    <button 
                      (click)="openDeleteConfirmation(product)"
                      [disabled]="deleting() === product.id"
                      class="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-300 text-red-800 disabled:text-gray-600 text-sm font-medium rounded-md cursor-pointer">
                      {{ deleting() === product.id ? 'Deleting...' : 'Delete' }}
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
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private readonly apiUrl = 'http://localhost:3000';

  shop$!: Observable<any>;
  products$!: Observable<Product[]>;

  // Delete state management
  deleting = signal<number | null>(null);
  deletedProducts = new Map<number, { product: Product; undoTimeout: ReturnType<typeof setTimeout> }>();

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

  openDeleteConfirmation(product: Product) {
    // Name confirmation: user must type the exact product name to delete
    const productName = prompt(
      `To delete "${product.name}", please type the product name exactly as shown:\n\n"${product.name}"`,
      ''
    );

    if (productName !== product.name) {
      if (productName !== null) {
        this.snackBar.open('Product name does not match. Deletion cancelled.', 'Close', { 
          duration: 4000, 
          panelClass: ['error-snackbar'] 
        });
      }
      return;
    }

    // Proceed with deletion
    this.deleteProduct(product);
  }

  deleteProduct(product: Product) {
    this.deleting.set(product.id!);

    this.http.delete<any>(`${this.apiUrl}/products/${product.id}`).subscribe({
      next: (response) => {
        this.deleting.set(null);

        // Store the deleted product for undo
        let undoTimeout: ReturnType<typeof setTimeout>;

        const snackBarRef = this.snackBar.open(
          `✓ Product "${product.name}" deleted`,
          'Undo',
          {
            duration: 5000,
            panelClass: ['success-snackbar']
          }
        );

        // Set the undo timeout
        undoTimeout = setTimeout(() => {
          this.deletedProducts.delete(product.id!);
        }, 5000);

        // Store for undo reference
        this.deletedProducts.set(product.id!, { product, undoTimeout });

        // Handle undo action
        snackBarRef.onAction().subscribe(() => {
          this.undoDelete(product);
        });

        // Reload products after deletion
        setTimeout(() => {
          this.reloadProducts();
        }, 100);
      },
      error: (err) => {
        this.deleting.set(null);
        console.error('Failed to delete product', err);
        const errorMessage = err?.error?.error || 'Failed to delete product';
        this.snackBar.open(errorMessage, 'Close', { 
          duration: 5000, 
          panelClass: ['error-snackbar'] 
        });
      }
    });
  }

  undoDelete(product: Product) {
    const deletedData = this.deletedProducts.get(product.id!);
    if (!deletedData) {
      this.snackBar.open('Undo window has closed', 'Close', { duration: 3000 });
      return;
    }

    // Clear the timeout
    clearTimeout(deletedData.undoTimeout);

    // Restore the product by re-creating it
    this.http.post<any>(`${this.apiUrl}/products`, deletedData.product).subscribe({
      next: () => {
        this.deletedProducts.delete(product.id!);
        this.snackBar.open('✓ Product restored successfully!', 'Close', { 
          duration: 3000, 
          panelClass: ['success-snackbar'] 
        });
        this.reloadProducts();
      },
      error: (err) => {
        console.error('Failed to restore product', err);
        this.snackBar.open('Failed to restore product', 'Close', { 
          duration: 5000, 
          panelClass: ['error-snackbar'] 
        });
      }
    });
  }

  reloadProducts() {
    this.shop$ = this.shopService.getShopInfo();
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
