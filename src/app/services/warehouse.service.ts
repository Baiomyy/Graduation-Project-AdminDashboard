import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
}

export interface WarehouseResponse {
  items: Warehouse[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private apiUrl = '/api/Warehouse/GetAll';

  constructor(private http: HttpClient) {}

  getWarehouses(pageNumber: number = 1, pageSize: number = 1000): Observable<WarehouseResponse> {
    console.log(`Service: Calling warehouse API with pagination - page: ${pageNumber}, size: ${pageSize}`);
    
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    console.log('Service: Warehouse API URL:', this.apiUrl);
    console.log('Service: Parameters:', params.toString());
    
    return this.http.get<WarehouseResponse>(this.apiUrl, { params }).pipe(
      map((response) => {
        console.log('Warehouse API Response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error fetching warehouses from API:', error);
        return of({
          items: [],
          pageNumber: pageNumber,
          pageSize: pageSize,
          totalCount: 0,
          totalPages: 0
        });
      })
    );
  }

  getWarehouseCount(): Observable<number> {
    return this.getWarehouses(1, 1).pipe(
      map(response => response.totalCount || 0)
    );
  }
} 