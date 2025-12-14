import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Product } from '../../../models/product';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-product.component.html'
})
export class EditProductComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private readonly apiUrl = 'http://localhost:3000';

  product = signal<Product | null>(null);
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
    image_urls: string | string[];
    stock_quantity: number;
    sku: string;
  }>({
    name: '',
    description: '',
    price: 0,
    image_urls: [],
    stock_quantity: 0,
    sku: ''
  });

  // Character limits
  readonly NAME_LIMIT = 60;
  readonly DESCRIPTION_LIMIT = 500;

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.error.set('Product ID not found');
      this.loading.set(false);
      return;
    }
    this.fetchProduct(productId);
  }

  fetchProduct(productId: string) {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    // Fetch product by ID from backend
    this.http.get<Product>(`${this.apiUrl}/products/${productId}`).subscribe({
      next: (data) => {
        this.product.set(data);
        
        // Parse image URLs
        let imageUrlsArray: string[] = [];
        if (Array.isArray(data.image_urls)) {
          imageUrlsArray = data.image_urls;
        } else if (typeof data.image_urls === 'string') {
          imageUrlsArray = data.image_urls ? [data.image_urls] : [];
        }
        
        this.existingImages.set(imageUrlsArray);
        this.formData.set({
          name: data.name || '',
          description: data.description || '',
          price: data.price || 0,
          image_urls: imageUrlsArray,
          stock_quantity: data.stock_quantity || 0,
          sku: data.sku || ''
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load product', err);
        const status = err?.status;
        let message = 'Failed to load product';
        if (status === 404) {
          message = 'Product not found';
        }
        this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        this.loading.set(false);
      }
    });
  }

  saveProduct() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.snackBar.open('Product ID not found', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    // Validate required fields
    if (!this.formData().name.trim()) {
      this.snackBar.open('Product name is required', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    if (this.formData().price < 0) {
      this.snackBar.open('Price must be a positive number', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    // First, upload any new images if present
    if (this.selectedImages().length > 0) {
      this.uploadNewImages().then(
        (newImageUrls) => {
          this.updateProduct(productId, newImageUrls);
        }
      ).catch((err) => {
        this.saving.set(false);
        this.snackBar.open('Failed to upload images', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      });
    } else {
      this.updateProduct(productId, []);
    }
  }

  private uploadNewImages(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      this.selectedImages().forEach(img => {
        formData.append('images', img.file);
      });

      this.http.post<{ imageUrls: string[] }>(`${this.apiUrl}/upload`, formData).subscribe({
        next: (response) => {
          resolve(response.imageUrls);
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  private updateProduct(productId: string, newImageUrls: string[]) {
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
      stock_quantity: this.formData().stock_quantity
    };

    this.http.put<any>(`${this.apiUrl}/products/${productId}`, dataToSend).subscribe({
      next: (response) => {
        // Now update images if needed
        if (this.imagesToRemove().length > 0 || newImageUrls.length > 0) {
          this.updateProductImages(productId, finalImageUrls);
        } else {
          this.saving.set(false);
          this.snackBar.open('✓ Product updated successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          
          // Update product in memory
          if (response.product) {
            this.product.set(response.product);
            this.existingImages.set(finalImageUrls);
            this.selectedImages.set([]);
            this.imagesToRemove.set([]);
          }
        }
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Failed to update product', err);
        const errorMessage = err?.error?.error || 'Failed to update product';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  private updateProductImages(productId: string, imageUrls: string[]) {
    // Convert all URLs to relative paths before sending to backend
    const relativeImageUrls = imageUrls.map(url => {
      // If URL starts with http, extract the relative path (e.g., /images/products/xxx.jpg)
      if (url.startsWith('http')) {
        // Remove the protocol and domain, keeping only the path
        const pathStart = url.indexOf('/', url.indexOf('://') + 3);
        return url.substring(pathStart);
      }
      return url;
    });

    // Send the final image list to backend for update
    this.http.put<any>(`${this.apiUrl}/products/${productId}/images`, { image_urls: relativeImageUrls }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.snackBar.open('✓ Product updated successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.selectedImages.set([]);
        this.imagesToRemove.set([]);
        
        // Update with the product returned from API response
        if (response.product) {
          this.product.set(response.product);
          
          // Parse image URLs from response
          let imageUrlsArray: string[] = [];
          if (Array.isArray(response.product.image_urls)) {
            imageUrlsArray = response.product.image_urls;
          } else if (typeof response.product.image_urls === 'string') {
            imageUrlsArray = response.product.image_urls ? [response.product.image_urls] : [];
          }
          
          this.existingImages.set(imageUrlsArray);
          this.formData.set({
            name: response.product.name || '',
            description: response.product.description || '',
            price: response.product.price || 0,
            image_urls: imageUrlsArray,
            stock_quantity: response.product.stock_quantity || 0,
            sku: response.product.sku || ''
          });
        } else {
          // Fallback: fetch product if response doesn't include it
          this.fetchProduct(productId);
        }
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Failed to update product images:', err);
        const errorMessage = err?.error?.error || 'Failed to update product images';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  goBack() {
    this.router.navigate(['/seller/dashboard']);
  }

  updateFormField(field: 'name' | 'description' | 'price' | 'image_urls' | 'stock_quantity' | 'sku', value: any) {
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

  displayPrice(price: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  getFirstImage(): string | null {
    const imageUrls = this.formData().image_urls;
    if (!imageUrls) {
      return null;
    }
    try {
      let images: string[];
      if (typeof imageUrls === 'string') {
        // Handle comma-separated string from GROUP_CONCAT
        images = imageUrls.includes(',') 
          ? imageUrls.split(',')
          : [imageUrls];
      } else {
        images = Array.isArray(imageUrls) ? imageUrls : [];
      }
      return images.length > 0 ? images[0] : null;
    } catch (e) {
      return null;
    }
  }

  clearImages() {
    this.formData.set({ ...this.formData(), image_urls: [] });
  }

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    
    // Limit to 10 total images (existing + new)
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

    // Reset input
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
    
    // Add existing images
    this.existingImages().forEach(url => {
      images.push({ type: 'existing', url });
    });
    
    // Add new images
    this.selectedImages().forEach((img, index) => {
      images.push({ type: 'new', preview: img.preview, index });
    });
    
    return images;
  }
}