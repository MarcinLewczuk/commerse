import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product, slugify } from '../models/product';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private base = 'http://localhost:3000';

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/products`);
  }

  getBySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/slug/${slug}`);
  }

  slugify(name: string) {
    return slugify(name);
  }
}
