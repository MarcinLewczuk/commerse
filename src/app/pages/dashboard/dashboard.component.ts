import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ProfileComponent } from '../../components/profile.component';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ProfileComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  protected auth = inject(AuthService);
}