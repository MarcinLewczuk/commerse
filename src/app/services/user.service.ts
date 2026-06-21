import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';

export interface UserInfo {
  id: number;
  auth0_id: string;
  role: string;
  shop_id: number | null;
  phone_number?: string | null;
  is_phone_verified?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = 'http://localhost:3000';

  /**
   * Auto-upsert user on Auth0 login
   * Checks if user exists, if not creates them with 'customer' role
   */
  autoUpsertUser(): Observable<UserInfo> {
    return this.auth.user$.pipe(
      switchMap(user => {
        if (!user?.sub) {
          return of(null as any);
        }
        
        // Extract Auth0 ID (remove 'auth0|' prefix)
        const auth0Id = user.sub.split('|')[1] || user.sub;
        
        return this.http.post<UserInfo>(`${this.apiUrl}/users/upsert`, {
          auth0_id: auth0Id,
          role: 'customer'
        }).pipe(
          catchError(error => {
            console.error('Failed to upsert user:', error);
            return of(null as any);
          })
        );
      })
    );
  }

  /**
   * Create a shop for the current user
   */
  createShop(shopName: string): Observable<any> {
    return this.auth.user$.pipe(
      switchMap(user => {
        if (!user?.sub) {
          throw new Error('User not authenticated');
        }

        const auth0Id = user.sub.split('|')[1] || user.sub;

        return this.http.post<any>(`${this.apiUrl}/shops`, {
          auth0_id: auth0Id,
          shop_name: shopName
        }).pipe(
          catchError(error => {
            console.error('Failed to create shop:', error);
            throw error;
          })
        );
      })
    );
  }

  /**
   * Send SMS verification code
   */
  sendVerificationCode(phoneNumber: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/verify-phone/send`, {
      phone_number: phoneNumber
    }).pipe(
      catchError(error => {
        console.error('Failed to send verification code:', error);
        throw error;
      })
    );
  }

  /**
   * Confirm SMS verification code
   */
  confirmVerificationCode(phoneNumber: string, code: string): Observable<any> {
    return this.auth.user$.pipe(
      switchMap(user => {
        if (!user?.sub) {
          throw new Error('User not authenticated');
        }

        const auth0Id = user.sub.split('|')[1] || user.sub;

        return this.http.post<any>(`${this.apiUrl}/users/verify-phone/confirm`, {
          auth0_id: auth0Id,
          phone_number: phoneNumber,
          code: code
        }).pipe(
          catchError(error => {
            console.error('Failed to confirm verification code:', error);
            throw error;
          })
        );
      })
    );
  }
}
