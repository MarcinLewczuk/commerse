import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface AuthUser {
	id: number;
	email: string;
	username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly http = new HttpClient(undefined as any); // placeholder to satisfy TS if inject not used directly
	// Store current user (null when logged out)
	private currentUserSig = signal<AuthUser | null>(null);

	// Derived auth state
	isAuthenticated = computed(() => this.currentUserSig() !== null);

	constructor(private client: HttpClient) {}

	login(email: string, password: string): Observable<AuthUser> {
		return this.client.post<AuthUser>('http://localhost:3000/users/login', { email, password }).pipe(
			tap(user => {
				this.currentUserSig.set(user);
				// Persist minimal session (avoid storing password)
				localStorage.setItem('auth_user', JSON.stringify(user));
			})
		);
	}

	signup(email: string, password: string): Observable<AuthUser> {
		return this.client.post<AuthUser>('http://localhost:3000/users', { email, password }).pipe(
			tap(user => {
				// Auto login
				this.currentUserSig.set(user);
			})
		);
	}

	logout(): void {
		this.currentUserSig.set(null);
		localStorage.removeItem('auth_user');
	}

	restore(): void {
		const raw = localStorage.getItem('auth_user');
		if (raw) {
			try {
				const parsed: AuthUser = JSON.parse(raw);
				this.currentUserSig.set(parsed);
			} catch { /* ignore */ }
		}
	}

	get currentUser(): AuthUser | null {
		return this.currentUserSig();
	}
}
