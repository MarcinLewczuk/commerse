import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
    constructor(private http: HttpClient) {}

    createUser(user: { email: string; password: string }) {
        return this.http.post('http://localhost:3000/users', user);
    }
}