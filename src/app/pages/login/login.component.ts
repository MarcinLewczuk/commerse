import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/AuthService';
import EmailValidation from '../../validators/email.validator';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  emailControl = new FormControl('');
  passwordControl = new FormControl('');

  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private http: HttpClient, private sb: MatSnackBar, private auth: AuthService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, EmailValidation.emailFormat]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.emailControl = this.loginForm.get('email') as FormControl;
    this.passwordControl = this.loginForm.get('password') as FormControl;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.sb.open('Invalid.', '', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      return;
    }

    const { email, password } = this.loginForm.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.sb.open('Login Successful.', '', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
        // Optionally navigate: this.router.navigate(['/']); (router not yet injected)
      },
      error: () => {
        this.sb.open('Login Credentials Incorrect.', '', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      }
    });
  }
}