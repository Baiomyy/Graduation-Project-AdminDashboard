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

  // Get all medicines without pagination (we'll fetch all pages)
  getAllMedicines(): Observable<Medicine[]> {
    console.log('Service: Getting all medicines');
    return new Observable((observer) => {
      const allMedicines: Medicine[] = [];
      let currentPage = 1;
      const pageSize = 100; // Large page size to minimize API calls

      const fetchPage = () => {
        const params = new HttpParams()
          .set('pageNumber', currentPage.toString())
          .set('size', pageSize.toString());

        console.log(
          `Service: Fetching page ${currentPage} with params:`,
          params.toString()
        );

        this.http
          .get<PaginatedResponse<Medicine>>(
            `${this.baseUrl}/GetAllMedicinesPaginated`,
            { params }
          )
          .subscribe({
            next: (response) => {
              console.log(`Service: Page ${currentPage} response:`, response);
              allMedicines.push(...response.items);

              if (currentPage < response.totalPages) {
                currentPage++;
                fetchPage();
              } else {
                console.log(
                  'Service: All pages fetched, total medicines:',
                  allMedicines.length
                );
                observer.next(allMedicines);
                observer.complete();
              }
            },
            error: (error) => {
              console.error(
                `Service: Error fetching page ${currentPage}:`,
                error
              );
              observer.error(error);
            },
          });
      };

      fetchPage();
    });
  }

  // Create new medicine
  createMedicine(medicine: Medicine): Observable<Medicine> {
    console.log('Service: Creating medicine:', medicine);
    return this.http.post<Medicine>(`${this.baseUrl}/CreateMedicine`, medicine);
  }

  // Update medicine using the correct backend endpoint
  updateMedicine(id: number, medicine: any): Observable<Medicine> {
    console.log('Service: Updating medicine with ID:', id, 'Data:', medicine);
    // Use PUT /UpdateMedicine/{id} as per backend API
    return this.http.put<Medicine>(
      `${this.baseUrl}/UpdateMedicine/${id}`,
      medicine
    );
  }

  // Delete medicine (working endpoint)
  deleteMedicine(id: number): Observable<any> {
    console.log('Service: Deleting medicine with ID:', id);
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // Search medicines - using the same base URL
  searchMedicines(searchTerm: string): Observable<PaginatedResponse<Medicine>> {
    console.log('Service: Searching medicines with term:', searchTerm);
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<PaginatedResponse<Medicine>>(
      `${this.baseUrl}/SearchMedicines`,
      {
        params,
      }
    );
  }

  // Filter medicines - using the same base URL
  filterMedicines(sort: string): Observable<PaginatedResponse<Medicine>> {
    console.log('Service: Filtering medicines with sort:', sort);
    const params = new HttpParams().set('sort', sort);
    return this.http.get<PaginatedResponse<Medicine>>(
      `${this.baseUrl}/FilterMedicines`,
      {
        params,
      }
    );
  }

  // Get medicines by area
  getMedicinesByArea(areaId: number): Observable<Medicine[]> {
    console.log('Service: Getting medicines by area ID:', areaId);
    return this.http.get<Medicine[]>(`${this.baseUrl}/ByArea/${areaId}`);
  }
}
