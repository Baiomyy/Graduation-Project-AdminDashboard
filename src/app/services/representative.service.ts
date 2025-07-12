import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, timeout, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Governate {
  id: number;
  name: string;
}

export interface Area {
  id: number;
  name: string;
}

export interface RepresentativeDTO {
  name: string;
  address: string;
  governate: string;
  governateId?: number;
  repAreas?: number[];
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
  isActive: boolean;
}

export interface RepresentativeResponse {
  items: Representative[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class RepresentativeService {
  private apiUrl = '/api/Representative/GetAll';

  constructor(private http: HttpClient) {}

  getAllRepresentatives(): Observable<any[]> {
    return this.http.get<any[]>('/api/Representative/GetAllRepresentatives');
  }

  getAllRepresentativesComplete(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getRepresentativeById(id: number): Observable<any> {
    return this.http.get<any>(`/api/Representative/GetById/${id}`);
  }

  getPharmaciesByRepresentativeId(
    representativeId: number
  ): Observable<RepresentativePharmaciesResponse> {
    return this.http.get<RepresentativePharmaciesResponse>(
      `/api/Representative/GetPharmaciesCountUsingId?id=${representativeId}`
    );
  }

  createRepresentative(rep: RepresentativeDTO): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // Validate required fields
    if (
      !rep.name ||
      !rep.email ||
      !rep.password ||
      !rep.phone ||
      !rep.address ||
      !rep.governate
    ) {
      return throwError(() => new Error('All fields are required'));
    }

    // Create the payload with the correct field name for areas
    const apiPayload = {
      name: rep.name.trim(),
      address: rep.address.trim(),
      governate: rep.governate.trim(),
      email: rep.email.trim(),
      password: rep.password,
      phone: rep.phone.trim(),
      RepAreas: rep.repAreas || [], // Use RepAreas as expected by the API, default to empty array
    };

    console.log('=== API REQUEST ===');
    console.log('URL:', '/api/Representative/CreateRepresentative');
    console.log('Payload:', apiPayload);
    console.log('Payload JSON:', JSON.stringify(apiPayload, null, 2));

    return this.http.post(
      '/api/Representative/CreateRepresentative',
      apiPayload,
      { headers }
    );
  }

  deleteRepresentative(id: number) {
    return this.http.delete(
      `/api/Representative/SoftDeleteRepresentative/${id}`
    );
  }

  getRepresentatives(
    pageNumber: number = 1,
    pageSize: number = 1000
  ): Observable<RepresentativeResponse> {
    console.log(
      `Service: Calling representative API with pagination - page: ${pageNumber}, size: ${pageSize}`
    );

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
          totalPages: 1,
        };
      }),
      catchError((error) => {
        console.error('Error fetching representatives from API:', error);
        return of({
          items: [],
          pageNumber: pageNumber,
          pageSize: pageSize,
          totalCount: 0,
          totalPages: 0,
        });
      })
    );
  }

  getRepresentativeCount(): Observable<number> {
    return this.getRepresentatives(1, 1000).pipe(
      map((response) => {
        console.log('Representative count from API:', response.totalCount);
        return response.totalCount || 0;
      })
    );
  }

  getGovernates(): Observable<Governate[]> {
    return this.http.get<Governate[]>('/api/Pharmacy/register').pipe(
      catchError((error) => {
        console.error('Error fetching governates:', error);
        return of([]);
      })
    );
  }

  getAreasByGovernateId(governateId: number): Observable<Area[]> {
    console.log('Making API call to fetch areas for governateId:', governateId);
    const startTime = Date.now();

    return this.http
      .get<Area[]>(`/api/Pharmacy/register?governateId=${governateId}`)
      .pipe(
        timeout(10000), // 10 second timeout
        map((areas) => {
          const endTime = Date.now();
          console.log(`Areas API call took ${endTime - startTime}ms`);
          console.log('Areas response:', areas);
          return areas;
        }),
        catchError((error) => {
          const endTime = Date.now();
          if (error.name === 'TimeoutError') {
            console.error(
              `Areas API call timed out after ${endTime - startTime}ms`
            );
            return of([]);
          }
          console.error(
            `Areas API call failed after ${endTime - startTime}ms:`,
            error
          );
          return of([]);
        })
      );
  }
}
