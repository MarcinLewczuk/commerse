import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import PasswordValidator from "../../validators/password-validator.validator"
// import { insertInto } from '../../../backend/src/queries';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
})

export class SignupComponent {
  emailControl = new FormControl('');
  passwordControl = new FormControl('');
  confirmPasswordControl = new FormControl('');

  signupForm = new FormGroup({
    email: this.emailControl,
    password: this.passwordControl,
    confirmPassword: this.confirmPasswordControl
  });

  constructor(private fb: FormBuilder) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, PasswordValidator.passwordStrength]],
      confirmPassword: ['', [Validators.required, PasswordValidator.matchPassword]]
    })
  }

  ngOnInit() {
    this.emailControl = this.signupForm.get('email') as FormControl;
    this.passwordControl = this.signupForm.get('password') as FormControl;
    this.confirmPasswordControl = this.signupForm.get('confirmPassword') as FormControl;
  }

  onSubmit() {
    
  }
}
