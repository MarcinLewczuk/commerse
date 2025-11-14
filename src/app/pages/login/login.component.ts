import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink ],
  templateUrl: './login.component.html',
})

export class LoginComponent {
  emailControl = new FormControl('', { updateOn: 'submit'});
  passwordControl = new FormControl('', { updateOn: 'submit'});

  loginForm = new FormGroup({
    email: this.emailControl,
    password: this.passwordControl
  });

  onSubmit() {

  }
}
