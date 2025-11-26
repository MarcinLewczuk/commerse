import { AbstractControl, AsyncValidatorFn, FormGroup, ValidationErrors } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, catchError, of } from 'rxjs';

export function userExists(http: HttpClient): AsyncValidatorFn {
  return (control: AbstractControl) => {
    const group = control as FormGroup;
    const email = group.get('email')?.value;
    const password = group.get('password')?.value;

    // Don't fire until both present
    if (!email || !password) return of(null);

    return http.post('http://localhost:3000/users/login', { email, password }, { observe: 'response' }).pipe(
      map(response => (response.status === 200 ? null : { invalidCredentials: true })),
      catchError((err: HttpErrorResponse) => {
        // Treat network / server / 4xx auth errors as invalid credentials for UI simplicity
        return of<ValidationErrors>({ invalidCredentials: true });
      })
    );
  };
}

const UserValidation = {
    userExists,
}

export default UserValidation;