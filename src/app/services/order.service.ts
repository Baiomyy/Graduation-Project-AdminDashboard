import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  orderId: number;
  quantity: number;
  totalPrice: number;
  wareHouseName: string;
  status: string;
  createdAt: string;
  wareHouseImage: string;
  details: any[];
}

export interface OrderApiResponse {
  message: string;
  result: {
    items: Order[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private baseUrl = 'http://www.pharmaatoncepredeploy.somee.com/api/Order';

  constructor(private http: HttpClient) {}

  getOrdersByPharmacyId(pharmacyId: number): Observable<OrderApiResponse> {
    return this.http.get<OrderApiResponse>(`${this.baseUrl}/getAllOrderByStatus/${pharmacyId}`);
  }
} 