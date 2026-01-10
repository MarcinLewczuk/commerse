import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Service, generateServiceCode } from '../../../models/service';
import { ServicesService } from '../../../services/services.service';

@Component({
  selector: 'app-create-service',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-service.component.html',
  styleUrl: './create-service.component.css'
})
export class CreateServiceComponent implements OnInit {
  private servicesService = inject(ServicesService);
  private router = inject(Router);
  private http = inject(HttpClient);

  service = {
    name: '',
    description: '',
    price: 0,
    duration_minutes: 0,
    shop_id: 0
  };

  imageFiles = signal<File[]>([]);
  imagePreviews = signal<string[]>([]);
  maxImages = 10;
  
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    // Get shop_id from localStorage (assuming user is logged in)
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.service.shop_id = user.shop_id || user.id;
    }
  }

  onFileSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    const remainingSlots = this.maxImages - this.imageFiles().length;
    const filesToAdd = files.slice(0, remainingSlots);

    filesToAdd.forEach(file => {
      if (file.type.startsWith('image/')) {
        this.imageFiles.update(current => [...current, file]);
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.update(current => [...current, e.target.result]);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  removeImage(index: number) {
    this.imageFiles.update(current => current.filter((_, i) => i !== index));
    this.imagePreviews.update(current => current.filter((_, i) => i !== index));
  }

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (this.imageFiles().length > 0) {
        imageUrls = await this.uploadImages();
      }

      // Generate unique service code
      const service_code = generateServiceCode(this.service.name, this.service.shop_id);

      // Create service with image URLs array (backend expects 'imageUrls')
      const serviceData = {
        ...this.service,
        service_code: service_code,
        imageUrls: imageUrls  // Send as array, not comma-separated string
      };

      this.servicesService.create(serviceData).subscribe({
        next: (response) => {
          this.successMessage.set('Service created successfully!');
          setTimeout(() => {
            this.router.navigate(['/seller/dashboard']);
          }, 1500);
        },
        error: (err) => {
          console.error('Failed to create service', err);
          this.error.set('Failed to create service');
          this.loading.set(false);
        }
      });
    } catch (err) {
      console.error('Failed to upload images', err);
      this.error.set('Failed to upload images');
      this.loading.set(false);
    }
  }

  private async uploadImages(): Promise<string[]> {
    const formData = new FormData();
    
    // Append all images with the field name 'images' (matching the backend expectation)
    this.imageFiles().forEach(file => {
      formData.append('images', file);
    });

    const response = await this.http.post<{ imageUrls: string[] }>('http://localhost:3000/upload/services', formData).toPromise();
    return response!.imageUrls;
  }

  private validateForm(): boolean {
    if (!this.service.name.trim()) {
      this.error.set('Service name is required');
      return false;
    }
    if (!this.service.description.trim()) {
      this.error.set('Service description is required');
      return false;
    }
    if (this.service.price <= 0) {
      this.error.set('Price must be greater than 0');
      return false;
    }
    if (this.service.duration_minutes <= 0) {
      this.error.set('Duration must be greater than 0');
      return false;
    }
    return true;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);
      const remainingSlots = this.maxImages - this.imageFiles().length;
      const filesToAdd = files.slice(0, remainingSlots);

      filesToAdd.forEach(file => {
        if (file.type.startsWith('image/')) {
          this.imageFiles.update(current => [...current, file]);
          
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.imagePreviews.update(current => [...current, e.target.result]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }
}
