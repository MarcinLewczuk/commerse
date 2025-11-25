import { AbstractControl, ValidationErrors } from '@angular/forms';

function passwordStrength(control: AbstractControl): ValidationErrors | null {
    const password = control.value;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isValidLength = password && password.length >= 8;

    const isPasswordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar && isValidLength;

    const ValidationErrors = {
        hasUpperCase: !hasUpperCase,
        hasLowerCase: !hasLowerCase,
        hasNumeric: !hasNumeric,
        hasSpecialChar: !hasSpecialChar,
        isValidLength: !isValidLength
    }

    return isPasswordValid ? null : ValidationErrors;
}

function matchPassword(control: AbstractControl): ValidationErrors | null {
    const confirmPassword = control.value;
    const password = control?.parent?.get('password')?.value;

    if (!password) return null;

    return confirmPassword === password ? null : {mismatch: true};
}

const PasswordValidation = {
    passwordStrength,
    matchPassword
}

export default PasswordValidation;