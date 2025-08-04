import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface MissingItem {
  pharmacyId: number;
  pharmacyName: string;
  pharmacyArea: string;
  representativeName: string;
}

export interface MissingItemDetail {
  medicineId: number;
  medicineName: string;
  arabicName: string;
}

export interface MissingItemsResponse {
  items: MissingItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Since the API returns a simple array, we'll create a wrapper
export interface MissingItemsArrayResponse extends Array<MissingItem> {}

@Injectable({
  providedIn: 'root'
})
export class MissingItemsService {
  private baseUrl = '/api/MissingItems';

  constructor(private http: HttpClient) {}

  getPharmaciesMissingItems(): Observable<MissingItemsResponse> {
    // Return all items without pagination
    return this.http.get<MissingItemsArrayResponse>(`${this.baseUrl}/PharmaciesMissingItems`).pipe(
      map((data: MissingItemsArrayResponse) => {
        return {
          items: data,
          pageNumber: 1,
          pageSize: data.length,
          totalCount: data.length,
          totalPages: 1
        };
      })
    );
  }

  getMissingItemsCount(): Observable<number> {
    return this.http.get<MissingItemsArrayResponse>(`${this.baseUrl}/PharmaciesMissingItems`).pipe(
      map((data: MissingItemsArrayResponse) => data.length)
    );
  }

  getMissingItemsById(pharmacyId: number): Observable<MissingItemDetail[]> {
    return this.http.get<MissingItemDetail[]>(`${this.baseUrl}/MissingItemsById/${pharmacyId}`);
  }

  deleteMissingItem(pharmacyId: number, medicineId: number): Observable<any> {
    const payload = {
      pharmacyId: pharmacyId,
      medicineId: medicineId
    };
    return this.http.delete(`${this.baseUrl}/delete-missing-item`, { body: payload });
  }

  deleteAllMissingItems(pharmacyId: number): Observable<any> {
    const payload = {
      pharmacyId: pharmacyId,
      medicineId: null
    };
    return this.http.delete(`${this.baseUrl}/delete-missing-item`, { body: payload });
  }
} 