import { Component, ElementRef, ViewChild, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../models/product';
import { Service, slugify as serviceSlugify } from '../../models/service';
import { ProductsService } from '../../services/products.service';
import { ServicesService } from '../../services/services.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private productsService = inject(ProductsService);
  private servicesService = inject(ServicesService);
  @ViewChild('carousel', { static: false }) carouselRef?: ElementRef<HTMLDivElement>;
  @ViewChild('servicesCarousel', { static: false }) servicesCarouselRef?: ElementRef<HTMLDivElement>;

  featured = signal<Product[]>([]);
  featuredServices = signal<Service[]>([]);
  loading = signal<boolean>(true);
  servicesLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  servicesError = signal<string | null>(null);
  canPrev = signal<boolean>(false);
  canNext = signal<boolean>(false);
  canPrevServices = signal<boolean>(false);
  canNextServices = signal<boolean>(false);

  ngOnInit() {
    this.fetchFeatured();
    this.fetchFeaturedServices();
  }

  private fetchFeatured() {
    this.loading.set(true);
    this.error.set(null);
    this.productsService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data.slice(0, 8) : [];
        this.featured.set(items);
        this.loading.set(false);
        this.scheduleUpdate();
      },
      error: (err) => {
        console.error('Failed to load featured products', err);
        this.error.set('Failed to load featured products');
        this.loading.set(false);
      }
    });
  }

  private fetchFeaturedServices() {
    this.servicesLoading.set(true);
    this.servicesError.set(null);
    this.servicesService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data.slice(0, 8) : [];
        this.featuredServices.set(items);
        this.servicesLoading.set(false);
        this.scheduleUpdateServices();
      },
      error: (err) => {
        console.error('Failed to load featured services', err);
        this.servicesError.set('Failed to load featured services');
        this.servicesLoading.set(false);
      }
    });
  }

  displayPrice(p: Product): string {
    const value = p.price;
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  getFirstProductImage(product: Product): string {
    if (!product.image_urls) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
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
      return images.length > 0 ? images[0] : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    } catch (e) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    }
  }

  getAllProductImages(product: Product): string[] {
    if (!product.image_urls) return [];
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

  // Slug helper used by template links
  slugify(name: string): string {
    return this.productsService.slugify(name);
  }

  // Carousel helpers
  private pageCount(): number {
    const el = this.carouselRef?.nativeElement;
    if (!el) return 1;
    const count = Math.ceil(el.scrollWidth / Math.max(1, el.clientWidth));
    return Math.max(1, count);
  }

  onScroll() {
    this.updateScrollAvailability();
  }

  prevPage() {
    this.scrollToPage(this.currentPageIndex() - 1);
  }

  nextPage() {
    this.scrollToPage(this.currentPageIndex() + 1);
  }

  private currentPageIndex(): number {
    const el = this.carouselRef?.nativeElement;
    if (!el) return 0;
    const pageWidth = Math.max(1, el.clientWidth);
    return Math.round(el.scrollLeft / pageWidth);
  }

  private scrollToPage(index: number) {
    const el = this.carouselRef?.nativeElement;
    if (!el) return;
    const pageWidth = el.clientWidth;
    const clamped = Math.max(0, Math.min(index, this.pageCount() - 1));
    el.scrollTo({ left: clamped * pageWidth, behavior: 'smooth' });
    this.updateScrollAvailability();
  }

  private updateScrollAvailability() {
    const el = this.carouselRef?.nativeElement;
    if (!el) {
      this.canPrev.set(false);
      this.canNext.set(false);
      return;
    }
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.round(el.scrollLeft);
    this.canPrev.set(left > 0);
    this.canNext.set(left < maxScroll - 1);
  }

  private scheduleUpdate() {
    const run = () => this.updateScrollAvailability();
    setTimeout(run, 0);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  }

  // Services carousel methods
  displayDuration(service: Service): string {
    if (!service.duration_minutes) return '—';
    const hours = Math.floor(service.duration_minutes / 60);
    const minutes = service.duration_minutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }

  getFirstServiceImage(service: Service): string {
    if (!service.image_urls) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    }
    try {
      let images: string[];
      if (typeof service.image_urls === 'string') {
        images = service.image_urls.includes(',') 
          ? service.image_urls.split(',')
          : [service.image_urls];
      } else {
        images = Array.isArray(service.image_urls) ? service.image_urls : [];
      }
      return images.length > 0 ? images[0] : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    } catch (e) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    }
  }

  getAllServiceImages(service: Service): string[] {
    if (!service.image_urls) return [];
    try {
      let images: string[];
      if (typeof service.image_urls === 'string') {
        images = service.image_urls.includes(',') 
          ? service.image_urls.split(',')
          : [service.image_urls];
      } else {
        images = Array.isArray(service.image_urls) ? service.image_urls : [];
      }
      return images;
    } catch (e) {
      return [];
    }
  }

  slugifyService(name: string): string {
    return serviceSlugify(name);
  }

  private pageCountServices(): number {
    const el = this.servicesCarouselRef?.nativeElement;
    if (!el) return 1;
    const count = Math.ceil(el.scrollWidth / Math.max(1, el.clientWidth));
    return Math.max(1, count);
  }

  onScrollServices() {
    this.updateScrollAvailabilityServices();
  }

  prevPageServices() {
    this.scrollToPageServices(this.currentPageIndexServices() - 1);
  }

  nextPageServices() {
    this.scrollToPageServices(this.currentPageIndexServices() + 1);
  }

  private currentPageIndexServices(): number {
    const el = this.servicesCarouselRef?.nativeElement;
    if (!el) return 0;
    const pageWidth = Math.max(1, el.clientWidth);
    return Math.round(el.scrollLeft / pageWidth);
  }

  private scrollToPageServices(index: number) {
    const el = this.servicesCarouselRef?.nativeElement;
    if (!el) return;
    const pageWidth = el.clientWidth;
    const clamped = Math.max(0, Math.min(index, this.pageCountServices() - 1));
    el.scrollTo({ left: clamped * pageWidth, behavior: 'smooth' });
    this.updateScrollAvailabilityServices();
  }

  private updateScrollAvailabilityServices() {
    const el = this.servicesCarouselRef?.nativeElement;
    if (!el) {
      this.canPrevServices.set(false);
      this.canNextServices.set(false);
      return;
    }
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.round(el.scrollLeft);
    this.canPrevServices.set(left > 0);
    this.canNextServices.set(left < maxScroll - 1);
  }

  private scheduleUpdateServices() {
    const run = () => this.updateScrollAvailabilityServices();
    setTimeout(run, 0);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  }
}
