import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  token: string;
  message: string;
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://www.pharmaatoncepredeploy.somee.com/api/Admin/Login';
  private readonly tokenKey = 'auth_token';

  login(payload: LoginRequestDto): Observable<LoginResponseDto> {
    return this.http.post<LoginResponseDto>(this.apiUrl, payload).pipe(
      tap((res) => {
        if (res && res.success && res.token) {
          localStorage.setItem(this.tokenKey, res.token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}


