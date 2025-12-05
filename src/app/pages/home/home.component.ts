import { Component, ElementRef, ViewChild, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../models/product';
import { ProductsService } from '../../services/products.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private productsService = inject(ProductsService);
  @ViewChild('carousel', { static: false }) carouselRef?: ElementRef<HTMLDivElement>;

  featured = signal<Product[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  canPrev = signal<boolean>(false);
  canNext = signal<boolean>(false);

  ngOnInit() {
    this.fetchFeatured();
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

  displayPrice(p: Product): string {
    const value = p.price;
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
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
}
