import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs/operators';

const getToken = (): string | null => {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
};

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  console.log('HTTP Request:', authReq);
  return next(authReq).pipe(
    tap({
      next: (event) => console.log('HTTP Response:', event),
      error: (error) => console.error('HTTP Error:', error)
    })
  );
}; 