import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Medicine {
  medicineId?: number;
  englishMedicineName: string;
  arabicMedicineName?: string;
  description?: string;
  price: number;
  drug?: number;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class MedicineService {
  private baseUrl = '/api/Medicine';

  constructor(private http: HttpClient) {}

  // Get medicines by page with optional search/sort query (server-side)
  getMedicinesPage(
    pageNumber: number,
    pageSize: number,
    searchTerm?: string,
    sort?: string
  ): Observable<PaginatedResponse<Medicine>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('size', pageSize.toString());

    // Prefer search when present, otherwise apply sort, else plain list
    if (searchTerm && searchTerm.trim().length > 0) {
      params = params
        .set('searchTerm', searchTerm.trim())
        .set('pageNumber', pageNumber.toString())
        .set('size', pageSize.toString());
      return this.http.get<PaginatedResponse<Medicine>>(
        `${this.baseUrl}/SearchMedicines`,
        { params }
      );
    }

    if (sort && sort.length > 0) {
      params = params
        .set('sort', sort)
        .set('pageNumber', pageNumber.toString())
        .set('size', pageSize.toString());
      return this.http.get<PaginatedResponse<Medicine>>(
        `${this.baseUrl}/FilterMedicines`,
        { params }
      );
    }

    return this.http.get<PaginatedResponse<Medicine>>(
      `${this.baseUrl}/GetAllMedicinesPaginated`,
      { params }
    );
  }

  // Create new medicine
  // createMedicine(medicine: Medicine): Observable<Medicine> {
  //   console.log('Service: Creating medicine:', medicine);
  //   return this.http.post<Medicine>(`${this.baseUrl}/CreateMedicine`, medicine);
  // }   -----------THE OLD ONE THAT NOT HANDLE IMAGE UPLOAD

  createMedicine(
    formValue: any,
    selectedImageFile: File | null
  ): Observable<Medicine> {
    const fd = new FormData();

    // Required fields
    fd.append('EnglishMedicineName', formValue.englishMedicineName);
    fd.append('ArabicMedicineName', formValue.arabicMedicineName);
    fd.append('Description', formValue.description);
    fd.append('Drug', formValue.drug.toString());
    fd.append('Price', formValue.price.toString());

    // Optional file upload
    if (selectedImageFile) {
      fd.append('Photo', selectedImageFile, selectedImageFile.name);
    }

    // Optional ImageUrl (backend validates as [Url])
    if (formValue.imageUrl) {
      fd.append('ImageUrl', formValue.imageUrl);
    }

    console.log('Service: Creating medicine with FormData:', fd);
    return this.http.post<Medicine>(`${this.baseUrl}/CreateMedicine`, fd);
  }

  // Update medicine using the correct backend endpoint
  updateMedicine(
    id: number,
    formValue: any,
    selectedImageFile: File | null
  ): Observable<Medicine> {
    const fd = new FormData();

    // Required fields
    fd.append('Id', id.toString());
    fd.append('EnglishMedicineName', formValue.englishMedicineName);
    fd.append('ArabicMedicineName', formValue.arabicMedicineName);
    fd.append('Description', formValue.description);
    fd.append('Drug', formValue.drug.toString());
    fd.append('Price', formValue.price.toString());

    // Optional file upload
    if (selectedImageFile) {
      fd.append('Photo', selectedImageFile, selectedImageFile.name);
    }

    // Optional ImageUrl (in case we don’t upload a new photo)
    if (formValue.imageUrl) {
      fd.append('ImageUrl', formValue.imageUrl);
    }

    console.log('Service: Updating medicine with FormData:', fd);

    return this.http.put<Medicine>(`${this.baseUrl}/UpdateMedicine/${id}`, fd);
  }

  // Delete medicine (working endpoint)
  deleteMedicine(id: number): Observable<any> {
    console.log('Service: Deleting medicine with ID:', id);
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // Search medicines with pagination
  searchMedicines(
    searchTerm: string,
    pageNumber: number,
    pageSize: number
  ): Observable<PaginatedResponse<Medicine>> {
    console.log('Service: Searching medicines with term:', searchTerm);
    const params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('pageNumber', pageNumber.toString())
      .set('size', pageSize.toString());
    return this.http.get<PaginatedResponse<Medicine>>(
      `${this.baseUrl}/SearchMedicines`,
      { params }
    );
  }

  // Deprecated: server-side filter sort removed in favor of fast client-side sort for current page

  // Get medicines by area
  getMedicinesByArea(areaId: number): Observable<Medicine[]> {
    console.log('Service: Getting medicines by area ID:', areaId);
    return this.http.get<Medicine[]>(`${this.baseUrl}/ByArea/${areaId}`);
  }
}
