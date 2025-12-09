import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { Observable, switchMap, map, catchError } from 'rxjs';
import { of } from 'rxjs';

export interface UserInfo {
  id: number;
  auth0_id: string;
  role: 'customer' | 'seller' | 'customer_seller';
  shop_id: number | null;
}

export interface ShopInfo {
  id: number;
  name: string;
  created_at: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class ShopService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly apiUrl = 'http://localhost:3000';

  /**
   * Get user info by Auth0 ID (role and shop_id if seller)
   */
  getUserInfo(): Observable<UserInfo | null> {
    return this.auth.user$.pipe(
      switchMap(user => {
        if (!user?.sub) {
          return of(null);
        }
        // Extract Auth0 ID (remove 'auth0|' prefix to match database format)
        const auth0Id = user.sub.split('|')[1] || user.sub;
        return this.http.get<UserInfo>(`${this.apiUrl}/users/by-auth0/${auth0Id}`);
      }),
      catchError(error => {
        console.error('Error fetching user info:', error);
        return of(null);
      })
    );
  }

  /**
   * Get shop info by Auth0 user ID (for sellers only)
   */
  getShopInfo(): Observable<ShopInfo | null> {
    return this.auth.user$.pipe(
      switchMap(user => {
        if (!user?.sub) {
          return of(null);
        }
        // Extract Auth0 ID (remove 'auth0|' prefix to match database format)
        const auth0Id = user.sub.split('|')[1] || user.sub;
        return this.http.get<ShopInfo>(`${this.apiUrl}/shops/by-user/${auth0Id}`);
      }),
      catchError(error => {
        console.error('Error fetching shop info:', error);
        return of(null);
      })
    );
  }

  /**
   * Check if user is a seller
   */
  isSeller(): Observable<boolean> {
    return this.getUserInfo().pipe(
      map(user => user ? user.role !== 'customer' : false)
    );
  }
}

