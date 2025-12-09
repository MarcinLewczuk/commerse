import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkWithHref } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ShopService } from '../../services/shop.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkWithHref, AsyncPipe],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  protected auth = inject(AuthService);
  protected shopService = inject(ShopService);
  
  isSeller$ = this.shopService.isSeller();
  
  logout() {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
  
  login() {
    this.auth.loginWithRedirect({
      appState: { target: '/dashboard' }
    });
  }
}
