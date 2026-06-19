import { Component, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { loadStripe } from '@stripe/stripe-js';
import { AuthService } from '@auth0/auth0-angular';
import { BasketService } from '../../services/basket.service';
import { StripeService } from '../../services/stripe.service';
import { CheckoutValidators } from '../../validators/checkout.validator';
import { slugify as productSlugify } from '../../models/product';
import { slugify as serviceSlugify } from '../../models/service';

@Component({
  selector: 'app-basket',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './basket.component.html',
  styleUrl: './basket.component.css'
})
export class BasketComponent implements AfterViewInit {
  basketService = inject(BasketService);
  stripeService = inject(StripeService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  items = this.basketService.items;
  itemCount = this.basketService.itemCount;
  totalPrice = this.basketService.totalPrice;

  // The Angular Form for User Details
  checkoutForm: FormGroup;

  // Stripe Element State for Card Details
  stripe: any;
  cardElement: any;
  cardError: string = '';
  isCardComplete: boolean = false;

  constructor() {
    // 1. Initialize the form with our custom validators
    this.checkoutForm = this.fb.group({
      email: ['', [Validators.required, CheckoutValidators.emailFormat]],
      name: ['', [Validators.required, CheckoutValidators.fullName]]
    });

    // 2. Auto-fill the email if the user is currently logged in via Auth0
    this.auth.user$.subscribe(user => {
      if (user?.email) {
        this.checkoutForm.patchValue({ email: user.email });
      }
      if (user?.name && user.name !== user.email) {
        this.checkoutForm.patchValue({ name: user.name });
      }
    });
  }

  async ngAfterViewInit() {
    this.stripe = await loadStripe('pk_test_CgEHo7hDTah00i9jEVOQ40Dw00tLwMxOrL');
    
    if (this.stripe) {
      const elements = this.stripe.elements();
      
      this.cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '14px',
            color: '#111827',
            '::placeholder': { color: '#9ca3af' },
          },
          invalid: { color: '#ef4444' },
        },
      });

      this.cardElement.mount('#card-element');

      // Stripe handles its own card validation in real-time right here
      this.cardElement.on('change', (event: any) => {
        this.isCardComplete = event.complete;
        this.cardError = event.error ? event.error.message : '';
      });
    }
  }

  // --- RESTORED HELPER METHODS ---

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

  // --- CHECKOUT LOGIC ---

  onBuyNow() {
    if (this.items().length === 0) return;

    // 1. Validate the Angular Form (Email & Name)
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched(); // Triggers the red error messages in HTML
      return;
    }

    // 2. Validate the Stripe Element (Card Data)
    if (!this.isCardComplete) {
      this.cardError = 'Please enter valid credit card details to proceed.';
      return;
    }

    // If both the user info and the secure card are valid, proceed!
    this.cardError = '';
    
    // Choose simulation for dissertation purposes
    this.stripeService.simulateCheckout(); 
  }
}