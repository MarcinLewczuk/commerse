import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Product } from '../../../models/product';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-product.component.html'
})
export class EditProductComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private readonly apiUrl = 'http://localhost:3000';

  product = signal<Product | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Form fields
  formData = signal<{
    name: string;
    description: string;
    price: number;
    image_url: string;
    stock_quantity: number;
    sku: string;
  }>({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    stock_quantity: 0,
    sku: ''
  });

  // Character limits
  readonly NAME_LIMIT = 60;
  readonly DESCRIPTION_LIMIT = 500;

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.error.set('Product ID not found');
      this.loading.set(false);
      return;
    }
    this.fetchProduct(productId);
  }

  fetchProduct(productId: string) {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    // Fetch product by ID from backend (we'll need to add this endpoint)
    this.http.get<Product>(`${this.apiUrl}/products/${productId}`).subscribe({
      next: (data) => {
        this.product.set(data);
        this.formData.set({
          name: data.name || '',
          description: data.description || '',
          price: data.price || 0,
          image_url: data.image_url || '',
          stock_quantity: data.stock_quantity || 0,
          sku: data.sku || ''
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load product', err);
        const status = err?.status;
        let message = 'Failed to load product';
        if (status === 404) {
          message = 'Product not found';
        }
        this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        this.loading.set(false);
      }
    });
  }

  saveProduct() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.snackBar.open('Product ID not found', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    // Validate required fields
    if (!this.formData().name.trim()) {
      this.snackBar.open('Product name is required', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    if (this.formData().price < 0) {
      this.snackBar.open('Price must be a positive number', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    // Only send editable fields to backend
    const dataToSend = {
      name: this.formData().name,
      description: this.formData().description,
      price: this.formData().price,
      stock_quantity: this.formData().stock_quantity
    };

    this.http.put<any>(`${this.apiUrl}/products/${productId}`, dataToSend).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.snackBar.open('✓ Product updated successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        
        // Update product in memory
        if (response.product) {
          this.product.set(response.product);
          this.formData.set({
            name: response.product.name || '',
            description: response.product.description || '',
            price: response.product.price || 0,
            image_url: response.product.image_url || '',
            stock_quantity: response.product.stock_quantity || 0,
            sku: response.product.sku || ''
          });
        }
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Failed to update product', err);
        const errorMessage = err?.error?.error || 'Failed to update product';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  goBack() {
    this.router.navigate(['/seller/dashboard']);
  }

  updateFormField(field: 'name' | 'description' | 'price' | 'image_url' | 'stock_quantity' | 'sku', value: any) {
    const current = this.formData();
    const updated = { ...current, [field]: value };
    this.formData.set(updated);
  }

  getRemainingChars(field: 'name' | 'description'): number {
    const limit = field === 'name' ? this.NAME_LIMIT : this.DESCRIPTION_LIMIT;
    return limit - this.formData()[field].length;
  }

  isCharLimitExceeded(field: 'name' | 'description'): boolean {
    const limit = field === 'name' ? this.NAME_LIMIT : this.DESCRIPTION_LIMIT;
    return this.formData()[field].length > limit;
  }

  displayPrice(price: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }
}