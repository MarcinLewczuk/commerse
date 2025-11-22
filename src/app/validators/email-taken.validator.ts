import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { map, catchError, of } from 'rxjs';

export function EmailTakenValidator(http: HttpClient): AsyncValidatorFn {
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
