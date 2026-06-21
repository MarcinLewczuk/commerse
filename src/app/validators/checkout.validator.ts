import { AbstractControl, ValidationErrors } from '@angular/forms';

export class CheckoutValidators {
  
  // Re-using your exact email pattern
  static emailFormat(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null; 
    const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return basicRegex.test(value) ? null : { emailFormat: true };
  }

  // Ensures the user types at least a first and last name
  static fullName(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const nameRegex = /^[a-zA-Z\u00C0-\u017F]+(?:\s+[a-zA-Z\u00C0-\u017F]+)+$/;
    return nameRegex.test(value.trim()) ? null : { invalidName: true };
  }
}