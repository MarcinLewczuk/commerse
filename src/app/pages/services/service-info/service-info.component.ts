import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Service } from '../../../models/service';
import { ServicesService } from '../../../services/services.service';

@Component({
  selector: 'app-service-info',
  imports: [CommonModule, RouterModule],
  templateUrl: './service-info.component.html',
  styleUrl: './service-info.component.css'
})
export class ServiceInfoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private servicesService = inject(ServicesService);
  private location = inject(Location);

  service = signal<Service | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  
  images = signal<string[]>([]);
  selectedImageIndex = signal<number>(0);
  
  zoomPosition = signal<{ x: number; y: number } | null>(null);
  isZooming = signal<boolean>(false);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.fetchService(slug);
    } else {
      this.error.set('Service not found');
      this.loading.set(false);
    }
  }

  fetchService(slug: string) {
    this.loading.set(true);
    this.error.set(null);
    this.servicesService.getBySlug(slug).subscribe({
      next: (data) => {
        this.service.set(data);
        this.parseImages(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load service', err);
        this.error.set('Failed to load service');
        this.loading.set(false);
      }
    });
  }

  parseImages(service: Service) {
    if (!service.image_urls) {
      this.images.set([]);
      return;
    }
    try {
      let imageArray: string[];
      if (typeof service.image_urls === 'string') {
        imageArray = service.image_urls.includes(',') 
          ? service.image_urls.split(',')
          : [service.image_urls];
      } else {
        imageArray = Array.isArray(service.image_urls) ? service.image_urls : [];
      }
      this.images.set(imageArray);
    } catch (e) {
      this.images.set([]);
    }
  }

  selectImage(index: number) {
    this.selectedImageIndex.set(index);
  }

  onMouseMove(event: MouseEvent) {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.zoomPosition.set({ x, y });
  }

  onMouseEnter() {
    this.isZooming.set(true);
  }

  onMouseLeave() {
    this.isZooming.set(false);
    this.zoomPosition.set(null);
  }

  goBack() {
    this.location.back();
  }
}
