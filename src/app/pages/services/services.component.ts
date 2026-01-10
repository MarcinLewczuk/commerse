import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Service, slugify } from '../../models/service';
import { ServicesService } from '../../services/services.service';

@Component({
  selector: 'app-services',
  imports: [CommonModule, RouterModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent implements OnInit {
  private servicesService = inject(ServicesService);

  services = signal<Service[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.fetchServices();
  }

  fetchServices() {
    this.loading.set(true);
    this.error.set(null);
    this.servicesService.getAll().subscribe({
      next: (data) => {
        this.services.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load services', err);
        this.error.set('Failed to load services');
        this.loading.set(false);
      }
    });
  }

  getServiceImage(service: Service): string | null {
    if (!service.image_urls) {
      return null;
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
      return images.length > 0 ? images[0] : null;
    } catch (e) {
      return null;
    }
  }

  slugify = slugify;
}
