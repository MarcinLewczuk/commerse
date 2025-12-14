import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Location } from '@angular/common';
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
  private location = inject(Location);

  product = signal<Product | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  mainImage = signal<string>('');
  isZoomed = signal<boolean>(false);
  zoomPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

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
        const images = this.getAllProductImages(p);
        if (images.length > 0) {
          this.mainImage.set(images[0]);
        }
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

  getProductImage(product: Product): string | null {
    if (!product.image_urls) {
      return null;
    }
    try {
      let images: string[];
      if (typeof product.image_urls === 'string') {
        // Handle comma-separated string from GROUP_CONCAT
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

  getAllProductImages(product: Product): string[] {
    if (!product.image_urls) {
      return [];
    }
    try {
      let images: string[];
      if (typeof product.image_urls === 'string') {
        // Handle comma-separated string from GROUP_CONCAT
        images = product.image_urls.includes(',') 
          ? product.image_urls.split(',')
          : [product.image_urls];
      } else {
        images = Array.isArray(product.image_urls) ? product.image_urls : [];
      }
      return images;
    } catch (e) {
      return [];
    }
  }

  toggleZoom() {
    this.isZoomed.update(z => !z);
  }

  onImageMouseMove(event: MouseEvent) {
    if (!this.isZoomed()) {
      return;
    }

    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    this.zoomPosition.set({ x, y });
  }

  getImageTransform() {
    if (!this.isZoomed()) {
      return {};
    }

    const { x, y } = this.zoomPosition();
    return {
      'transform': `scale(2) translate(calc(${50 - x}% / 2), calc(${50 - y}% / 2))`,
      'transform-origin': `${x}% ${y}%`
    };
  }

  goBack() {
    this.location.back();
  }
}

