import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../models/product';
import { ProductsService } from '../../services/products.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './products.component.html'
})
export class ProductsComponent implements OnInit {
  private productsService = inject(ProductsService);

  // Signals for state management
  products = signal<Product[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.fetchProducts();
  }

  fetchProducts() {
    this.loading.set(true);
    this.error.set(null);
    this.productsService.getAll().subscribe({
      next: (data) => {
        this.products.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.error.set('Failed to load products');
        this.loading.set(false);
      }
    });
  }

  displayName(p: Product): string {
    return p.name || 'Untitled';
  }

  displayPrice(p: Product): string {
    const value = p.price;
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  imageSrc(p: Product): string | null {
    return p.image_url || null;
  }

  slug(p: Product): string {
    return this.productsService.slugify(p.name);
  }
}