import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { PharmacyService } from '../../services/pharmacy.service';
import { WarehouseService } from '../../services/warehouse.service';
import { RepresentativeService } from '../../services/representative.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.scss'],
})
export class DashboardHome implements OnInit {
  pharmacyCount: number = 0;
  warehouseCount: number = 0;
  representativeCount: number = 0;
  loading: boolean = true;

  constructor(
    private pharmacyService: PharmacyService,
    private warehouseService: WarehouseService,
    private representativeService: RepresentativeService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    const pharmacyCount$ = this.pharmacyService
      .getPharmacies(1, 1)
      .pipe(map((response) => response.totalCount || 0));

    const warehouseCount$ = this.warehouseService.getWarehouseCount();

    const representativeCount$ =
      this.representativeService.getRepresentativeCount();

    forkJoin({
      pharmacy: pharmacyCount$,
      warehouse: warehouseCount$,
      representative: representativeCount$,
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (counts) => {
          this.pharmacyCount = counts.pharmacy;
          this.warehouseCount = counts.warehouse;
          this.representativeCount = counts.representative;
          console.log('Pharmacy count loaded:', this.pharmacyCount);
          console.log('Warehouse count loaded:', this.warehouseCount);
          console.log('Representative count loaded:', this.representativeCount);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          // Ensure some sane defaults on error
          this.pharmacyCount = this.pharmacyCount || 0;
          this.warehouseCount = this.warehouseCount || 0;
          this.representativeCount = this.representativeCount || 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  getProgressPercentage(count: number): number {
    // Calculate progress percentage based on count
    // Using a max of 50 as reference for 100%
    const maxCount = 50;
    return Math.min((count / maxCount) * 100, 100);
  }

  // Logout is now handled from the Navbar for global visibility
}
