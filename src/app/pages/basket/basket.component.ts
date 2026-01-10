import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BasketService } from '../../services/basket.service';
import { slugify as productSlugify } from '../../models/product';
import { slugify as serviceSlugify } from '../../models/service';

@Component({
  selector: 'app-basket',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './basket.component.html',
  styleUrl: './basket.component.css'
})
export class BasketComponent {
  basketService = inject(BasketService);

  items = this.basketService.items;
  itemCount = this.basketService.itemCount;
  totalPrice = this.basketService.totalPrice;

  displayPrice(price: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  displayItemTotal(price: number, quantity: number): string {
    return this.displayPrice(price * quantity);
  }

  getFirstImage(imageUrls: string | string[] | undefined): string {
    if (!imageUrls) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    }

    try {
      let images: string[];
      if (typeof imageUrls === 'string') {
        images = imageUrls.includes(',') ? imageUrls.split(',') : [imageUrls];
      } else {
        images = Array.isArray(imageUrls) ? imageUrls : [];
      }
      return images.length > 0 ? images[0] : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    } catch (e) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E';
    }
  }

  getItemLink(item: any, type: string): string {
    if (type === 'product') {
      return `/products/${productSlugify(item.name)}`;
    } else {
      return `/services/${serviceSlugify(item.name)}`;
    }
  }

  increaseQuantity(type: 'product' | 'service', itemId: number) {
    const currentQuantity = this.basketService.getItemQuantity(type, itemId);
    this.basketService.updateQuantity(type, itemId, currentQuantity + 1);
  }

  decreaseQuantity(type: 'product' | 'service', itemId: number) {
    const currentQuantity = this.basketService.getItemQuantity(type, itemId);
    if (currentQuantity > 1) {
      this.basketService.updateQuantity(type, itemId, currentQuantity - 1);
    }
  }

  removeItem(type: 'product' | 'service', itemId: number) {
    this.basketService.removeItem(type, itemId);
  }

  clearBasket() {
    if (confirm('Are you sure you want to clear your basket?')) {
      this.basketService.clearBasket();
    }
  }

  onBuyNow() {
    // Placeholder for future implementation
    alert('Checkout functionality coming soon!');
  }
}
