import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PharmacyService } from '../../services/pharmacy.service';
import { WarehouseService } from '../../services/warehouse.service';
import { RepresentativeService } from '../../services/representative.service';

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHome implements OnInit {
  pharmacyCount: number = 0;
  warehouseCount: number = 0;
  representativeCount: number = 0;
  loading: boolean = true;

  constructor(
    private pharmacyService: PharmacyService,
    private warehouseService: WarehouseService,
    private representativeService: RepresentativeService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Load pharmacy count
    this.pharmacyService.getPharmacies(1, 1).subscribe({
      next: (response) => {
        this.pharmacyCount = response.totalCount || 0;
        console.log('Pharmacy count loaded:', this.pharmacyCount);
      },
      error: (error) => {
        console.error('Error loading pharmacy count:', error);
        this.pharmacyCount = 0;
      }
    });

    // Load warehouse count
    this.warehouseService.getWarehouseCount().subscribe({
      next: (count) => {
        this.warehouseCount = count;
        console.log('Warehouse count loaded:', this.warehouseCount);
      },
      error: (error) => {
        console.error('Error loading warehouse count:', error);
        this.warehouseCount = 0;
      }
    });

    // Load representative count
    this.representativeService.getRepresentativeCount().subscribe({
      next: (count) => {
        this.representativeCount = count;
        console.log('Representative count loaded:', this.representativeCount);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading representative count:', error);
        this.representativeCount = 0;
        this.loading = false;
      }
    });
  }

  getProgressPercentage(count: number): number {
    // Calculate progress percentage based on count
    // Using a max of 50 as reference for 100%
    const maxCount = 50;
    return Math.min((count / maxCount) * 100, 100);
  }
}
