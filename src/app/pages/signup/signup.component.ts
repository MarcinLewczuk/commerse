import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import PasswordValidator from "../../validators/password.validator"
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { EmailTakenValidator } from '../../validators/email-taken.validator';
import { MatSnackBar } from '@angular/material/snack-bar'

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
})

export class SignupComponent {
  emailControl = new FormControl('');
  passwordControl = new FormControl('');
  confirmPasswordControl = new FormControl('');
  http = inject(HttpClient);
  sb = inject(MatSnackBar)
  r = inject(Router)

  existingEmails: any[] =[]
  existingEmails$ = of(this.existingEmails);

  signupForm = new FormGroup({
    email: this.emailControl,
    password: this.passwordControl,
    confirmPassword: this.confirmPasswordControl
  });

  constructor(private fb: FormBuilder) {
    this.http = inject(HttpClient)
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email], EmailTakenValidator(this.http)],
      password: ['', [Validators.required, PasswordValidator.passwordStrength]],
      confirmPassword: ['', [Validators.required, PasswordValidator.matchPassword]]
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

  const user = { email, password };

  this.http.post('http://localhost:3000/users', user)
  // Success
  .subscribe(() => {
    console.log("Account created.");
    
    this.r.navigate(['/login']);
    
    this.sb.open('Account Created Successfully!', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    })
    });
  }
}
