import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Service } from '../../../models/service';

@Component({
  selector: 'app-edit-service',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-service.component.html',
  styleUrl: './edit-service.component.css'
})
export class EditServiceComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private readonly apiUrl = 'http://localhost:3000';

  service = signal<Service | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Image handling
  selectedImages = signal<{ file: File; preview: string }[]>([]);
  existingImages = signal<string[]>([]);
  imagesToRemove = signal<string[]>([]);

  // Form fields
  formData = signal<{
    name: string;
    description: string;
    price: number;
    duration_minutes: number;
    service_code: string;
    image_urls: string | string[];
  }>({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 0,
    service_code: '',
    image_urls: []
  });

  // Character limits
  readonly NAME_LIMIT = 60;
  readonly DESCRIPTION_LIMIT = 500;

  ngOnInit() {
    const serviceId = this.route.snapshot.paramMap.get('id');
    if (!serviceId) {
      this.error.set('Service ID not found');
      this.loading.set(false);
      return;
    }
    this.fetchService(serviceId);
  }

  fetchService(serviceId: string) {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.http.get<Service>(`${this.apiUrl}/services/${serviceId}`).subscribe({
      next: (data) => {
        this.service.set(data);
        
        // Parse image URLs
        let imageUrlsArray: string[] = [];
        if (Array.isArray(data.image_urls)) {
          imageUrlsArray = data.image_urls;
        } else if (typeof data.image_urls === 'string') {
          imageUrlsArray = data.image_urls ? data.image_urls.split(',') : [];
        }
        
        this.existingImages.set(imageUrlsArray);
        this.formData.set({
          name: data.name || '',
          description: data.description || '',
          price: data.price || 0,
          duration_minutes: data.duration_minutes || 0,
          service_code: data.service_code || '',
          image_urls: imageUrlsArray
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load service', err);
        const status = err?.status;
        let message = 'Failed to load service';
        if (status === 404) {
          message = 'Service not found';
        }
        this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        this.loading.set(false);
      }
    });
  }

  saveService() {
    const serviceId = this.route.snapshot.paramMap.get('id');
    if (!serviceId) {
      this.snackBar.open('Service ID not found', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    // Validate required fields
    if (!this.formData().name.trim()) {
      this.snackBar.open('Service name is required', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    if (this.formData().price <= 0) {
      this.snackBar.open('Price must be greater than 0', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    if (this.formData().duration_minutes <= 0) {
      this.snackBar.open('Duration must be greater than 0', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    // First, upload any new images if present
    if (this.selectedImages().length > 0) {
      this.uploadNewImages().then(
        (newImageUrls) => {
          this.updateService(serviceId, newImageUrls);
        }
      ).catch((err) => {
        this.saving.set(false);
        this.snackBar.open('Failed to upload images', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      });
    } else {
      this.updateService(serviceId, []);
    }
  }

  private uploadNewImages(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      this.selectedImages().forEach(img => {
        formData.append('images', img.file);
      });

      this.http.post<{ imageUrls: string[] }>(`${this.apiUrl}/upload/services`, formData).subscribe({
        next: (response) => {
          resolve(response.imageUrls);
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  private updateService(serviceId: string, newImageUrls: string[]) {
    // Combine existing images (minus removed ones) with newly uploaded images
    const finalImageUrls = [
      ...this.existingImages().filter(url => !this.imagesToRemove().includes(url)),
      ...newImageUrls
    ];

    // Only send editable fields to backend
    const dataToSend = {
      name: this.formData().name,
      description: this.formData().description,
      price: this.formData().price,
      duration_minutes: this.formData().duration_minutes
    };

    this.http.put<any>(`${this.apiUrl}/services/${serviceId}`, dataToSend).subscribe({
      next: (response) => {
        // Now update images if needed
        if (this.imagesToRemove().length > 0 || newImageUrls.length > 0) {
          this.updateServiceImages(serviceId, finalImageUrls);
        } else {
          this.saving.set(false);
          this.snackBar.open('✓ Service updated successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          
          // Update service in memory
          if (response.service) {
            this.service.set(response.service);
            this.existingImages.set(finalImageUrls);
            this.selectedImages.set([]);
            this.imagesToRemove.set([]);
          }
        }
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Failed to update service', err);
        const errorMessage = err?.error?.error || 'Failed to update service';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  private updateServiceImages(serviceId: string, imageUrls: string[]) {
    // Convert all URLs to relative paths before sending to backend
    const relativeImageUrls = imageUrls.map(url => {
      if (url.startsWith('http')) {
        const pathStart = url.indexOf('/', url.indexOf('://') + 3);
        return url.substring(pathStart);
      }
      return url;
    });

    this.http.put<any>(`${this.apiUrl}/services/${serviceId}/images`, { image_urls: relativeImageUrls }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.snackBar.open('✓ Service updated successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.selectedImages.set([]);
        this.imagesToRemove.set([]);
        
        if (response.service) {
          this.service.set(response.service);
          
          let imageUrlsArray: string[] = [];
          if (Array.isArray(response.service.image_urls)) {
            imageUrlsArray = response.service.image_urls;
          } else if (typeof response.service.image_urls === 'string') {
            imageUrlsArray = response.service.image_urls ? response.service.image_urls.split(',') : [];
          }
          
          this.existingImages.set(imageUrlsArray);
          this.formData.set({
            name: response.service.name || '',
            description: response.service.description || '',
            price: response.service.price || 0,
            duration_minutes: response.service.duration_minutes || 0,
            service_code: response.service.service_code || '',
            image_urls: imageUrlsArray
          });
        } else {
          this.fetchService(serviceId);
        }
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Failed to update service images:', err);
        const errorMessage = err?.error?.error || 'Failed to update service images';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  goBack() {
    this.router.navigate(['/seller/dashboard']);
  }

  updateFormField(field: 'name' | 'description' | 'price' | 'duration_minutes' | 'image_urls', value: any) {
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

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    
    const totalImages = this.existingImages().length + this.selectedImages().length + files.length;
    if (totalImages > 10) {
      this.snackBar.open('Maximum 10 images allowed', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }

    const newImages: { file: File; preview: string }[] = [];
    let processed = 0;

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          newImages.push({
            file,
            preview: reader.result as string
          });
          processed++;

          if (processed === files.length) {
            this.selectedImages.set([...this.selectedImages(), ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    if (input) {
      input.value = '';
    }
  }

  removeExistingImage(imageUrl: string) {
    this.imagesToRemove.set([...this.imagesToRemove(), imageUrl]);
    this.existingImages.set(
      this.existingImages().filter(url => url !== imageUrl)
    );
  }

  removeNewImage(index: number) {
    const images = this.selectedImages();
    this.selectedImages.set(images.filter((_, i) => i !== index));
  }

  undoRemoveImage(imageUrl: string) {
    this.existingImages.set([...this.existingImages(), imageUrl]);
    this.imagesToRemove.set(
      this.imagesToRemove().filter(url => url !== imageUrl)
    );
  }

  getAllImages(): { type: 'existing' | 'new', url?: string, preview?: string, index?: number }[] {
    const images: { type: 'existing' | 'new', url?: string, preview?: string, index?: number }[] = [];
    
    this.existingImages().forEach(url => {
      images.push({ type: 'existing', url });
    });
    
    this.selectedImages().forEach((img, index) => {
      images.push({ type: 'new', preview: img.preview, index });
    });
    
    return images;
  }
}
