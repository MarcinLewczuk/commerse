import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Service } from '../models/service';

@Injectable({
  providedIn: 'root'
})
export class ServicesService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  getAll(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services`);
  }

  getById(id: number): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/services/${id}`);
  }

  getBySlug(slug: string): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/services/slug/${slug}`);
  }

  getByShopId(shopId: number): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/services/shop/${shopId}`);
  }

  create(service: Partial<Service>): Observable<Service> {
    return this.http.post<Service>(`${this.apiUrl}/services`, service);
  }

  update(id: number, service: Partial<Service>): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/services/${id}`, service);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/services/${id}`);
  }
}
