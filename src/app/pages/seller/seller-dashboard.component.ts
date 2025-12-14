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
  templateUrl: './seller-dashboard.component.html'
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

  getFirstImage(product: Product): string | null {
    if (!product.image_urls) {
      return null;
    }
    try {
      let images: string[];
      if (typeof product.image_urls === 'string') {
        // Handle comma-separated string (shouldn't happen now, but keep for safety)
        images = product.image_urls.includes(',') 
          ? product.image_urls.split(',')
          : [product.image_urls];
      } else {
        images = Array.isArray(product.image_urls) ? product.image_urls : [];
      }
      return images.length > 0 ? images[0] : null;
    } catch (e) {
      return null;
    }
  }
}
