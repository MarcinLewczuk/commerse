import { Component } from '@angular/core';
import { RouterLink, RouterLinkWithHref } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkWithHref],
  templateUrl: './header.component.html'
})
export class HeaderComponent {}
