import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-callback',
  standalone: true,
  template: `<p>Redirecting...</p>`
})
export class CallbackComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.auth.handleRedirectCallback().subscribe((result: any) => {
      // Navigate to the target URL stored in appState, or default to /dashboard
      const target = result?.appState?.target || '/dashboard';
      this.router.navigate([target]);
    });
  }
}
