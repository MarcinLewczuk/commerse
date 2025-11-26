import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { map, catchError, of } from 'rxjs';

export function emailTaken(http: HttpClient): AsyncValidatorFn {
  return (control: AbstractControl) => {
    const email = control.value;

    if (!email) return of(null); // no email typed yet - no error

    return http.get<any[]>('http://localhost:3000/users/email').pipe(
      map(existingEmails => {
        const taken = existingEmails.some(e => e.email === email);
        return taken ? { emailTaken: true } : null;
      }),
      catchError(() => of(null)) // backend offline - allow typing
    );
  };
}

export function emailFormat(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null; // leave required to other validators
  // Basic pattern: no spaces, one '@', domain with a dot and TLD >=2 chars
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return basicRegex.test(value) ? null : { emailFormat: true };
}

const EmailValidation = {
  emailTaken,
  emailFormat,
}

export default EmailValidation;