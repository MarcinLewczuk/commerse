import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShopService } from '../../../services/shop.service';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-product.component.html'
})
export class CreateProductComponent {
  private shopService = inject(ShopService);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private readonly apiUrl = 'http://localhost:3000';

  // Form state
  creatingProduct = signal<boolean>(false);
  selectedImages = signal<{ file: File; preview: string }[]>([]);
  
  // Individual signals for form fields (needed for ngModel two-way binding)
  productName = signal<string>('');
  productDescription = signal<string>('');
  productPrice = signal<number>(0);
  productStock = signal<number>(0);

  goBack() {
    this.router.navigate(['/seller/dashboard']);
  }

  // Signal update handlers for form inputs
  handleNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.productName.set(target.value);
  }

  handleDescriptionInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.productDescription.set(target.value);
  }

  handlePriceInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value) || 0;
    this.productPrice.set(value);
  }

  handleStockInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10) || 0;
    this.productStock.set(value);
  }

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    
    // Limit to 10 images
    if (files.length > 10) {
      this.snackBar.open('Maximum 10 images allowed', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }

    const newImages: { file: File; preview: string }[] = [];
    const totalImages = this.selectedImages().length + files.length;

    if (totalImages > 10) {
      this.snackBar.open(`You can only add ${10 - this.selectedImages().length} more images`, 'Close', { 
        duration: 3000, 
        panelClass: ['error-snackbar'] 
      });
      return;
    }

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          newImages.push({
            file,
            preview: reader.result as string
          });

          if (newImages.length === files.length) {
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

  removeImage(index: number) {
    const images = this.selectedImages();
    this.selectedImages.set(images.filter((_, i) => i !== index));
  }

  async submitAddProduct() {
    // Validate all fields are filled
    const productName = this.productName().trim();
    const price = this.productPrice();
    const stock = this.productStock();

    if (!productName) {
      this.snackBar.open('⚠ Product name is required', 'Close', { 
        duration: 3000, 
        panelClass: ['error-snackbar'] 
      });
      return;
    }

    if (price === null || price === undefined || isNaN(price)) {
      this.snackBar.open('⚠ Price is required and must be a number', 'Close', { 
        duration: 3000, 
        panelClass: ['error-snackbar'] 
      });
      return;
    }

    if (price <= 0) {
      this.snackBar.open('⚠ Price must be greater than 0', 'Close', { 
        duration: 3000, 
        panelClass: ['error-snackbar'] 
      });
      return;
    }

    if (stock === null || stock === undefined || isNaN(stock)) {
      this.snackBar.open('⚠ Stock quantity must be a number', 'Close', { 
        duration: 3000, 
        panelClass: ['error-snackbar'] 
      });
      return;
    }

    if (stock < 0) {
      this.snackBar.open('⚠ Stock quantity cannot be negative', 'Close', { 
        duration: 3000, 
        panelClass: ['error-snackbar'] 
      });
      return;
    }

    this.creatingProduct.set(true);

    const shopSubscription = this.shopService.getShopInfo().subscribe({
      next: (shop) => {
        if (!shop?.id) {
          this.creatingProduct.set(false);
          shopSubscription.unsubscribe();
          this.snackBar.open('⚠ Could not determine shop. Please refresh and try again.', 'Close', { 
            duration: 5000, 
            panelClass: ['error-snackbar'] 
          });
          return;
        }

        shopSubscription.unsubscribe();

        // Upload images if any
        if (this.selectedImages().length > 0) {
          this.uploadImages(this.selectedImages().map(img => img.file))
            .then(imageUrls => {
              this.createProductWithImages(shop.id, productName, imageUrls);
            })
            .catch(err => {
              this.creatingProduct.set(false);
              this.snackBar.open('✗ Failed to upload images', 'Close', { 
                duration: 5000, 
                panelClass: ['error-snackbar'] 
              });
            });
        } else {
          this.createProductWithImages(shop.id, productName, []);
        }
      },
      error: (err) => {
        shopSubscription.unsubscribe();
        this.creatingProduct.set(false);
        this.snackBar.open('⚠ Failed to get shop info. Please try again.', 'Close', { 
          duration: 5000, 
          panelClass: ['error-snackbar'] 
        });
      },
      complete: () => {
        // Subscription completed
      }
    });
  }

  private createProductWithImages(shopId: number, productName: string, imageUrls: string[]) {
    // Create product with images as JSON array
    const productData = {
      shop_id: shopId,
      name: productName,
      description: this.productDescription(),
      price: Number(this.productPrice()),
      stock_quantity: Number(this.productStock()),
      image_urls: imageUrls
    };

    this.http.post<any>(`${this.apiUrl}/products`, productData).subscribe({
      next: (response) => {
        this.creatingProduct.set(false);
        this.snackBar.open('✓ Product created successfully!', 'Close', { 
          duration: 3000, 
          panelClass: ['success-snackbar'] 
        });
        setTimeout(() => {
          this.router.navigate(['/seller/dashboard']);
        }, 500);
      },
      error: (err) => {
        this.creatingProduct.set(false);
        const errorMessage = err?.error?.error || err?.error?.message || err?.message || 'Failed to create product';
        this.snackBar.open(`✗ ${errorMessage}`, 'Close', { 
          duration: 5000, 
          panelClass: ['error-snackbar'] 
        });
      }
    });
  }

  private uploadImages(files: File[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      this.http.post<{ imageUrls: string[] }>(`${this.apiUrl}/upload/products`, formData).subscribe({
        next: (response) => {
          resolve(response.imageUrls);
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }
}
