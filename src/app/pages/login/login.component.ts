import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink ],
  templateUrl: './login.component.html',
})

export class LoginComponent {
  emailControl = new FormControl('');
  passwordControl = new FormControl('');
}
