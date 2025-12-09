import { Component, inject, signal } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShopService } from '../services/shop.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (auth.isLoading$ | async) {
      <div class="loading-text">Loading profile...</div>
    } @else {
      @if (auth.user$ | async; as user) {
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
          @if (user.picture) {
            <img 
              [src]="user.picture" 
              [alt]="user.name || 'User'"
              class="profile-picture"
              style="
                width: 110px; 
                height: 110px; 
                border-radius: 50%; 
                object-fit: cover;
                border: 3px solid #63b3ed;
              "
            />
          }
          <div style="text-align: center;">
            <div 
              class="profile-name" 
              style="
                font-size: 2rem; 
                font-weight: 600; 
                color: #333; 
                margin-bottom: 0.5rem;
              "
            >
              {{ user.name }}
            </div>
            <div 
              class="profile-email" 
              style="
                font-size: 1.15rem; 
                color: #666;
              "
            >
              {{ user.email }}
            </div>
          </div>

          <!-- Shop Creation Section -->
          <div style="margin-top: 1.5rem; width: 100%; max-width: 400px;">
            @if (userInfo$ | async; as userInfo) {
              @if (userInfo && !userInfo.shop_id) {
                <div style="padding: 1.5rem; background-color: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 0.5rem;">
                  <h3 style="font-size: 1.1rem; font-weight: 600; color: #1e40af; margin-bottom: 0.5rem;">
                    Become a Seller
                  </h3>
                  <p style="font-size: 0.95rem; color: #1e3a8a; margin-bottom: 1rem;">
                    Create a shop to start selling products.
                  </p>
                  @if (showShopForm()) {
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                      <input
                        type="text"
                        placeholder="Enter shop name"
                        [(ngModel)]="shopName"
                        style="
                          padding: 0.5rem;
                          border: 1px solid #93c5fd;
                          border-radius: 0.375rem;
                          font-size: 1rem;
                        "
                      />
                      <div style="display: flex; gap: 0.5rem;">
                        <button
                          (click)="createShop()"
                          [disabled]="isCreatingShop() || !shopName.trim()"
                          style="
                            flex: 1;
                            padding: 0.5rem;
                            background-color: #3b82f6;
                            color: white;
                            border: none;
                            border-radius: 0.375rem;
                            font-weight: 600;
                            cursor: pointer;
                            opacity: !isCreatingShop() && shopName.trim() ? 1 : 0.5;
                          "
                        >
                          {{ isCreatingShop() ? 'Creating...' : 'Create Shop' }}
                        </button>
                        <button
                          (click)="cancelCreateShop()"
                          [disabled]="isCreatingShop()"
                          style="
                            padding: 0.5rem 1rem;
                            background-color: #e5e7eb;
                            border: none;
                            border-radius: 0.375rem;
                            font-weight: 600;
                            cursor: pointer;
                          "
                        >
                          Cancel
                        </button>
                      </div>
                      @if (shopError()) {
                        <div style="
                          padding: 0.75rem;
                          background-color: #fee2e2;
                          border: 1px solid #fecaca;
                          border-radius: 0.375rem;
                          color: #991b1b;
                          font-size: 0.875rem;
                        ">
                          {{ shopError() }}
                        </div>
                      }
                    </div>
                  } @else {
                    <button
                      (click)="toggleShopForm()"
                      style="
                        width: 100%;
                        padding: 0.75rem;
                        background-color: #3b82f6;
                        color: white;
                        border: none;
                        border-radius: 0.375rem;
                        font-weight: 600;
                        cursor: pointer;
                      "
                    >
                      Create a Shop
                    </button>
                  }
                </div>
              } @else if (userInfo && userInfo.shop_id) {
                <div style="padding: 1.5rem; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.5rem;">
                  <p style="font-size: 0.95rem; color: #166534; font-weight: 600;">
                    ✓ You are a seller! Visit your shop dashboard to manage your products.
                  </p>
                </div>
              }
            }
          </div>
        </div>
      }
    }
  `,
})
export class ProfileComponent {
  protected auth = inject(AuthService);
  private shopService = inject(ShopService);
  private userService = inject(UserService);

  userInfo$ = this.shopService.getUserInfo();
  showShopForm = signal(false);
  isCreatingShop = signal(false);
  shopError = signal<string | null>(null);
  shopName = '';

  toggleShopForm() {
    this.showShopForm.update(v => !v);
    this.shopError.set(null);
    this.shopName = '';
  }

  cancelCreateShop() {
    this.toggleShopForm();
  }

  createShop() {
    if (!this.shopName.trim()) {
      this.shopError.set('Shop name is required');
      return;
    }

    this.isCreatingShop.set(true);
    this.shopError.set(null);

    this.userService.createShop(this.shopName).subscribe({
      next: (response) => {
        console.log('Shop created:', response);
        this.isCreatingShop.set(false);
        this.showShopForm.set(false);
        this.shopName = '';
        // Refresh user info
        this.userInfo$ = this.shopService.getUserInfo();
      },
      error: (error) => {
        this.isCreatingShop.set(false);
        const errorMessage = error?.error?.error || 'Failed to create shop';
        this.shopError.set(errorMessage);
      }
    });
  }
}
