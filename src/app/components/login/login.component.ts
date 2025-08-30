import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequestDto } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    // If already authenticated, navigate to dashboard directly
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }
    this.loading = true;
    const payload: LoginRequestDto = { email: this.email, password: this.password };
    this.authService.login(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = res.message || 'Invalid email or password.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;
        if (status === 400 || status === 401) {
          this.errorMessage = 'Invalid email or password.';
        } else {
          this.errorMessage = err?.error?.message || 'Login failed. Please try again.';
        }
      }
    });
  }
}


