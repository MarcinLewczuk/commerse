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
                @if (!userInfo.is_phone_verified) {
                  <div style="padding: 1.5rem; background-color: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 0.5rem;">
                    <h3 style="font-size: 1.1rem; font-weight: 600; color: #1e40af; margin-bottom: 0.5rem;">
                      Verify Phone Number
                    </h3>
                    <p style="font-size: 0.95rem; color: #1e3a8a; margin-bottom: 1rem;">
                      You must verify your phone number to become a seller.
                    </p>
                    @if (!isCodeSent()) {
                      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; gap: 0.5rem;">
                          <select
                            [(ngModel)]="selectedCountryCode"
                            style="padding: 0.5rem; border: 1px solid #93c5fd; border-radius: 0.375rem; font-size: 1rem; width: 110px; background-color: white;"
                          >
                            @for (country of countryCodes; track country.code) {
                              <option [value]="country.code">{{ country.label }}</option>
                            }
                          </select>
                          <input
                            type="tel"
                            placeholder="1234567890"
                            [(ngModel)]="phoneNumber"
                            style="padding: 0.5rem; border: 1px solid #93c5fd; border-radius: 0.375rem; font-size: 1rem; flex: 1;"
                          />
                        </div>
                        <button
                          (click)="sendVerificationCode()"
                          [disabled]="isSendingCode() || !phoneNumber.trim()"
                          style="padding: 0.75rem; background-color: #3b82f6; color: white; border: none; border-radius: 0.375rem; font-weight: 600; cursor: pointer; opacity: !isSendingCode() && phoneNumber.trim() ? 1 : 0.5;"
                        >
                          {{ isSendingCode() ? 'Sending...' : 'Send Verification Code' }}
                        </button>
                      </div>
                    } @else {
                      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <input
                          type="text"
                          placeholder="6-digit code"
                          [(ngModel)]="verificationCode"
                          style="padding: 0.5rem; border: 1px solid #93c5fd; border-radius: 0.375rem; font-size: 1rem;"
                        />
                        <button
                          (click)="verifyCode()"
                          [disabled]="isVerifyingCode() || !verificationCode.trim()"
                          style="padding: 0.75rem; background-color: #10b981; color: white; border: none; border-radius: 0.375rem; font-weight: 600; cursor: pointer; opacity: !isVerifyingCode() && verificationCode.trim() ? 1 : 0.5;"
                        >
                          {{ isVerifyingCode() ? 'Verifying...' : 'Verify Code' }}
                        </button>
                      </div>
                    }
                    @if (phoneError()) {
                      <div style="margin-top: 0.75rem; padding: 0.75rem; background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 0.375rem; color: #991b1b; font-size: 0.875rem;">
                        {{ phoneError() }}
                      </div>
                    }
                  </div>
                } @else {
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
                }
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

  // Use the centralized user info observable from ShopService
  userInfo$ = this.shopService.getUserInfo();
  
  showShopForm = signal(false);
  isCreatingShop = signal(false);
  shopError = signal<string | null>(null);
  shopName = '';

  isCodeSent = signal(false);
  isSendingCode = signal(false);
  isVerifyingCode = signal(false);
  phoneError = signal<string | null>(null);
  selectedCountryCode = '+1';
  countryCodes = [
    { code: '+1', label: 'US/CA (+1)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+91', label: 'IN (+91)' },
    { code: '+61', label: 'AU (+61)' },
    { code: '+81', label: 'JP (+81)' },
    { code: '+49', label: 'DE (+49)' },
    { code: '+33', label: 'FR (+33)' },
    { code: '+39', label: 'IT (+39)' },
    { code: '+34', label: 'ES (+34)' },
    { code: '+55', label: 'BR (+55)' },
    { code: '+52', label: 'MX (+52)' }
  ];
  phoneNumber = '';
  verificationCode = '';

  sendVerificationCode() {
    if (!this.phoneNumber.trim()) {
      this.phoneError.set('Phone number is required');
      return;
    }
    this.isSendingCode.set(true);
    this.phoneError.set(null);
    const fullPhoneNumber = this.selectedCountryCode + this.phoneNumber.trim();
    this.userService.sendVerificationCode(fullPhoneNumber).subscribe({
      next: () => {
        this.isSendingCode.set(false);
        this.isCodeSent.set(true);
      },
      error: (err) => {
        this.isSendingCode.set(false);
        this.phoneError.set(err?.error?.error || 'Failed to send code');
      }
    });
  }

  verifyCode() {
    if (!this.verificationCode.trim()) {
      this.phoneError.set('Verification code is required');
      return;
    }
    this.isVerifyingCode.set(true);
    this.phoneError.set(null);
    const fullPhoneNumber = this.selectedCountryCode + this.phoneNumber.trim();
    this.userService.confirmVerificationCode(fullPhoneNumber, this.verificationCode).subscribe({
      next: () => {
        this.isVerifyingCode.set(false);
        this.shopService.refreshUserInfo();
      },
      error: (err) => {
        this.isVerifyingCode.set(false);
        this.phoneError.set(err?.error?.error || 'Failed to verify code');
      }
    });
  }

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
        this.isCreatingShop.set(false);
        this.showShopForm.set(false);
        this.shopName = '';
        
        // Trigger refresh of user info across all components
        this.shopService.refreshUserInfo();
      },
      error: (error) => {
        this.isCreatingShop.set(false);
        const errorMessage = error?.error?.error || 'Failed to create shop';
        this.shopError.set(errorMessage);
      }
    });
  }
}
