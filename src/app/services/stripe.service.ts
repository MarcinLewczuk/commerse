import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { loadStripe } from '@stripe/stripe-js';
import { Router } from '@angular/router';
import { BasketItem } from './basket.service';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  // Replace with your actual Stripe Publishable Key from your dashboard
  private stripePublishableKey = 'pk_test_51SnpPKQqHU3PccaENUp3xBsMEXFFQGfwoLkGu6xVKyWv1iXK1bWqQXdBdqhx3KD1Ug8Ppot1UR5NaRAEPjwt5aM200sxaBsdjm';
  private backendUrl = 'http://localhost:3000';

  /**
   * Option A: Pure Frontend Simulation (Fastest for Dissertation Demos)
   * Simulates a payment gateway load and forces a redirect to your success route.
   */
  simulateCheckout() {
    console.log('Simulating payment gateway redirect...');
    // Redirects directly to your success page route
    this.router.navigate(['/success']);
  }

  /**
   * Option B: Real Stripe API Flow
   * Communicates with your NodeTS backend to create a checkout session and redirect to Stripe
   */
async redirectToCheckout(items: BasketItem[]) {
    try {
      const stripe = await loadStripe(this.stripePublishableKey);
      if (!stripe) throw new Error('Stripe failed to initialize.');

      const lineItems = items.map(i => ({
        name: i.item.name,
        price: i.item.price,
        quantity: i.quantity
      }));

      this.http.post<{ id: string }>(`${this.backendUrl}/create-checkout-session`, { items: lineItems })
        .subscribe({
          next: async (session) => {
            // This is the line that actually takes the user away to pay
            await (stripe as any).redirectToCheckout({ sessionId: session.id });
          },
          error: (err) => {
            console.error('Check your Node backend - the /create-checkout-session route failed:', err);
            alert('Payment service temporarily unavailable. Please check your backend console.');
          }
        });
    } catch (error) {
      console.error('Stripe error:', error);
    }
  }
}