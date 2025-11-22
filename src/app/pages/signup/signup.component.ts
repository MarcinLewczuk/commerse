import { Component, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import PasswordValidator from "../../validators/password-validator.validator"
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

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
      email: ['', [Validators.required, Validators.email]],
      // EmailValidator.emailTaken()
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
  const email = this.emailControl.value;
  const password = this.passwordControl.value;

  this.http.get<any[]>('http://localhost:3000/users/email')
    .subscribe(existingEmails => {

      const isTaken = existingEmails.some(e => e.email === email);

      if (isTaken) {
        console.log("Email is taken");
        return;
      }

      const user = { email, password };

      this.http.post('http://localhost:3000/users', user)
        .subscribe(() => {
          console.log("Account created");
        });
    });
}
}
