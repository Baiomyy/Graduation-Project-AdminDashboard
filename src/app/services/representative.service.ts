import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface RepresentativeDTO {
  name: string;
  address: string;
  governate: string;
  email: string;
  password: string;
  phone: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  phoneNumber: string;
  governate: string;
  userName: string;
  address: string;
  areaId: number;
  areaName: string;
  orderCount?: number;
}

export interface RepresentativePharmaciesResponse {
  representativeId: number;
  representativeName: string;
  pharmaciesCount: number;
  pharmacies: Pharmacy[];
}

export interface Representative {
  id: number;
  name: string;
  code: string;
  phoneNumber: string;
  email: string;
}

export interface RepresentativeResponse {
  items: Representative[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class RepresentativeService {
  private apiUrl = '/api/Representative/GetAll';

  constructor(private http: HttpClient) {}

  getAllRepresentatives(): Observable<any[]> {
    return this.http.get<any[]>('/api/Representative/GetAllRepresentatives');
  }

  getPharmaciesByRepresentativeId(representativeId: number): Observable<RepresentativePharmaciesResponse> {
    return this.http.get<RepresentativePharmaciesResponse>(`/api/Representative/GetPharmaciesCountUsingId?id=${representativeId}`);
  }

  createRepresentative(rep: RepresentativeDTO): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log('Outgoing payload:', rep);
    return this.http.post('/api/Representative/CreateRepresentative', rep, { headers });
  }

  deleteRepresentative(id: number) {
    return this.http.delete(`/api/Representative/DeleteRepresentative/${id}`);
  }

  getRepresentatives(pageNumber: number = 1, pageSize: number = 1000): Observable<RepresentativeResponse> {
    console.log(`Service: Calling representative API with pagination - page: ${pageNumber}, size: ${pageSize}`);
    
    const url = '/api/Representative/GetAllRepresentatives';
    console.log('Service: Representative API URL:', url);
    
    return this.http.get<any[]>(url).pipe(
      map((response) => {
        console.log('Representative API Response:', response);
        // The API returns an array directly, so we need to wrap it in our expected format
        return {
          items: response || [],
          pageNumber: pageNumber,
          pageSize: pageSize,
          totalCount: response ? response.length : 0,
          totalPages: 1
        };
      }),
      catchError(error => {
        console.error('Error fetching representatives from API:', error);
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

  getRepresentativeCount(): Observable<number> {
    return this.getRepresentatives(1, 1000).pipe(
      map(response => {
        console.log('Representative count from API:', response.totalCount);
        return response.totalCount || 0;
      })
    );
  }
} 