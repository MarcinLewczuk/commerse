import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import PasswordValidator from "../../validators/password.validator"
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import EmailValidation from '../../validators/email.validator';
import { MatSnackBar } from '@angular/material/snack-bar'
import { AuthService } from '../../services/AuthService';
import PasswordValidation from '../../validators/password.validator';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
})

export class SignupComponent {
  emailControl = new FormControl('');
  passwordControl = new FormControl('');
  confirmPasswordControl = new FormControl('');
  sb = inject(MatSnackBar)
  r = inject(Router)

  existingEmails: any[] =[]
  existingEmails$ = of(this.existingEmails);

  signupForm = new FormGroup({
    email: this.emailControl,
    password: this.passwordControl,
    confirmPassword: this.confirmPasswordControl
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private http: HttpClient) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, EmailValidation.emailFormat], EmailValidation.emailTaken(this.http)],
      password: ['', [Validators.required, PasswordValidation.passwordStrength]],
      confirmPassword: ['', [Validators.required, PasswordValidation.matchPassword]]
    })
  }

  ngOnInit():void {
    this.emailControl = this.signupForm.get('email') as FormControl;
    this.passwordControl = this.signupForm.get('password') as FormControl;
    this.confirmPasswordControl = this.signupForm.get('confirmPassword') as FormControl;
  }

onSubmit() {
  // Fail
  if (this.signupForm.invalid) {
    console.log("Form invalid.");
    
    this.sb.open('Invalid.', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    })

    return;
  }

  const { email, password } = this.signupForm.value;
  this.auth.signup(email!, password!).subscribe({
    next: () => {
      this.auth.login(email!, password!)
      this.r.navigate(['/']);
      this.sb.open('Account Created Successfully!', '', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });

    },
    error: () => {
      this.sb.open('Signup failed.', '', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  });
  }
}
