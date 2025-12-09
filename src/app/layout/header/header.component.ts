import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkWithHref } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkWithHref, AsyncPipe],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  protected auth = inject(AuthService);
  
  logout() {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
  
  login() {
    this.auth.loginWithRedirect({
      appState: { target: '/dashboard' }
    });
  }
}
