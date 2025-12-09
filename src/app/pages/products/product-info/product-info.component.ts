import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Product } from '../../../models/product';

@Component({
  selector: 'app-product-info',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-info.component.html'
})
export class ProductInfoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private title = inject(Title);

  product = signal<Product | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error.set('Invalid product slug');
      this.loading.set(false);
      return;
    }
    this.fetchProduct(slug);
  }

  fetchProduct(slug: string) {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<Product>(`http://localhost:3000/products/slug/${slug}`).subscribe({
      next: (p) => {
        this.product.set(p);
        this.title.setTitle(p.name);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load product', err);
        const status = err?.status;
        if (status === 404) {
          this.error.set('Product not found');
        } else {
          this.error.set('Failed to load product');
        }
        this.loading.set(false);
      }
    });
  }
}
