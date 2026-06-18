import { Component, inject, signal, effect } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkWithHref } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { ShopService } from '../../services/shop.service';
import { BasketService } from '../../services/basket.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkWithHref, AsyncPipe],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  protected auth = inject(AuthService);
  protected shopService = inject(ShopService);
  protected basketService = inject(BasketService);
  
  isSeller$ = this.shopService.isSeller();
  basketItemCount = this.basketService.itemCount;
  
  constructor() {
    // Permanently enable dark mode
    document.documentElement.classList.add('dark');
  }
  
  logout() {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
  
  login() {
    this.auth.loginWithRedirect({
      appState: { target: '/dashboard' }
    });
  }
}
