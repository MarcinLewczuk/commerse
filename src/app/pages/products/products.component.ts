import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Routes } from '@angular/router';
import { ProductInfoComponent } from './product-info/product-info.component';

interface Product {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  price: number;
  image_url: string;
  date_added: string; // ISO date string from API
  last_updated: string; // ISO date string from API
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './products.component.html'
})
export class ProductsComponent implements OnInit {
  private http = inject(HttpClient);

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
    this.http.get<Product[]>('http://localhost:3000/products').subscribe({
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
    return p.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
  }
}