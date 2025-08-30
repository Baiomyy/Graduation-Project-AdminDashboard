import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Pharmacy {
  id: number;
  pharmcyName: string;
  doctorName: string;
  phoneNumber: string;
  governate: string;
  address: string;
  representativeName?: string;
  representativeCode?: string;
}

export interface PharmacyResponse {
  items: Pharmacy[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacyService {
  private apiUrl = '/api/Pharmacy/GetAllPharmacies';

  constructor(private http: HttpClient) {}

  getPharmacies(pageNumber: number = 1, pageSize: number = 10): Observable<PharmacyResponse> {
    console.log(`Service: Calling pharmacy API with pagination - page: ${pageNumber}, size: ${pageSize}`);
    
    // Create pagination parameters
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    console.log('Service: API URL:', this.apiUrl);
    console.log('Service: Parameters:', params.toString());
    
    return this.http.get<PharmacyResponse>(this.apiUrl, { params }).pipe(
      map((response) => {
        console.log('Pharmacy API Response:', response);
        console.log('Service: Response items count:', response.items?.length);
        console.log('Service: Response totalCount:', response.totalCount);
        console.log('Service: Response totalPages:', response.totalPages);
        
        // Validate response structure
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response format from API');
        }
        
        // Ensure required properties exist
        if (!response.items || !Array.isArray(response.items)) {
          console.warn('Response missing items array, creating empty array');
          response.items = [];
        }
        
        if (typeof response.totalCount !== 'number') {
          console.warn('Response missing totalCount, setting to 0');
          response.totalCount = 0;
        }
        
        if (typeof response.totalPages !== 'number') {
          console.warn('Response missing totalPages, calculating from totalCount');
          response.totalPages = Math.ceil(response.totalCount / pageSize);
        }
        
        // Ensure the response has the correct page information
        response.pageNumber = pageNumber;
        response.pageSize = pageSize;
        
        return response;
      }),
      catchError(error => {
        console.error('Error fetching pharmacies from API:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        
        // Return empty response
        console.log('API failed, returning empty response');
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

  getPharmacyDetails(pharmacyId: number): Observable<any> {
    console.log(`Service: Calling pharmacy details API for ID: ${pharmacyId}`);
    const detailsUrl = `/api/Pharmacy/Details/${pharmacyId}`;
    
    console.log('Service: Details API URL:', detailsUrl);
    
    return this.http.get<any>(detailsUrl).pipe(
      map((response) => {
        console.log('Pharmacy details response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error fetching pharmacy details:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        
        // Try with different URL format as fallback
        console.log('Trying alternative URL format...');
        const alternativeUrl = `/api/Pharmacy/Details?id=${pharmacyId}`;
        
        return this.http.get<any>(alternativeUrl).pipe(
          map((response) => {
            console.log('Pharmacy details response (alternative):', response);
            return response;
          }),
          catchError(secondError => {
            console.error('Alternative URL also failed:', secondError);
            return of(null);
          })
        );
      })
    );
  }

  getPharmacyOrders(pharmacyId: number, pageNumber: number = 1, pageSize: number = 15): Observable<any> {
    console.log(`Service: Calling pharmacy orders API for ID: ${pharmacyId}, page: ${pageNumber}, size: ${pageSize}`);
    const ordersUrl = `/api/Order/getAllOrderByStatus/${pharmacyId}`;
    
    // Create pagination parameters - try pageNumber instead of page
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    console.log('Service: Orders API URL:', ordersUrl);
    console.log('Service: Orders Parameters:', params.toString());
    
    return this.http.get<any>(ordersUrl, { params }).pipe(
      map((response) => {
        console.log('Pharmacy orders response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error fetching pharmacy orders:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        
        // Return empty response
        console.log('Orders API failed, returning empty response');
        return of({
          message: 'error',
          result: {
            items: [],
            pageNumber: pageNumber,
            pageSize: pageSize,
            totalCount: 0,
            totalPages: 0
          }
        });
      })
    );
  }
} 