import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PharmacyService,
  Pharmacy,
  PharmacyResponse,
} from '../../services/pharmacy.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pharmacies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacies.component.html',
  styleUrls: ['./pharmacies.scss'],
})
export class PharmaciesComponent implements OnInit, OnDestroy {
  pharmacies: Pharmacy[] = [];
  filteredPharmacies: Pharmacy[] = []; // Add filtered array
  currentPage: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  totalPages: number = 0;
  selectedPharmacyId: number | null = null;
  pharmacyDetails: any = null;
  showDetails: boolean = false;
  loadingDetails: boolean = false;

  // Search properties
  searchTerm: string = '';

  // Orders properties
  orders: any[] = [];
  showOrders: boolean = false;
  loadingOrders: boolean = false;
  ordersCurrentPage: number = 1;
  ordersPageSize: number = 15;
  ordersTotalCount: number = 0;
  ordersTotalPages: number = 0;
  selectedOrder: any = null;
  showOrderDetails: boolean = false;

  private subscription: Subscription = new Subscription();

  constructor(
    private pharmacyService: PharmacyService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    console.log('PharmaciesComponent initialized');
    // Reset all loading states to prevent stuck spinners after hot reload
    this.loadingOrders = false;
    this.loadingDetails = false;
    this.showOrders = false;
    this.showDetails = false;
    this.orders = [];
    this.pharmacyDetails = null;
    this.selectedPharmacyId = null;
    this.selectedOrder = null;
    this.showOrderDetails = false;

    this.loadPharmacies();
  }

  ngOnDestroy(): void {
    console.log('PharmaciesComponent destroyed');
    this.subscription.unsubscribe();
    // Reset loading states on destroy
    this.loadingOrders = false;
    this.loadingDetails = false;
  }

  loadPharmacies(): void {
    console.log('Starting to load pharmacies');

    // Unsubscribe from previous subscription if exists
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    try {
      // Use real API call with pagination
      this.subscription = this.pharmacyService
        .getPharmacies(this.currentPage, this.pageSize)
        .subscribe({
          next: (response) => {
            console.log('Data received from API, updating component state');
            this.ngZone.run(() => {
              this.pharmacies = response.items || [];
              this.filteredPharmacies = [...this.pharmacies]; // Initialize filtered array
              this.currentPage = response.pageNumber || 1;
              this.pageSize = response.pageSize || 10;
              this.totalCount = response.totalCount || 0;
              this.totalPages = response.totalPages || 0;

              console.log('Pharmacies loaded, count:', this.pharmacies.length);
              console.log('Current page:', this.currentPage);
              console.log('Total pages:', this.totalPages);
              console.log('Total count:', this.totalCount);

              // Load representative information for each pharmacy
              this.loadRepresentativeInfo();

              this.cdr.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error fetching pharmacies from API:', error);
            this.ngZone.run(() => {
              this.cdr.detectChanges();
            });
            // Fallback to static data if API fails
            this.loadStaticData();
          },
        });
    } catch (error) {
      console.error('Error in loadPharmacies:', error);
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
      // Fallback to static data if service injection fails
      this.loadStaticData();
    }
  }

  loadStaticData(): void {
    console.log('Loading static data');
    this.ngZone.run(() => {
      this.pharmacies = [
        {
          id: 1,
          pharmcyName: 'El Ezaby',
          doctorName: 'Dr. Ahmed',
          phoneNumber: '01012345678',
          governate: 'القاهرة',
          address: '123 Main St',
          representativeName: 'Ahmed Rep',
          representativeCode: 'REP001',
        },
        {
          id: 2,
          pharmcyName: 'Seif Pharmacy',
          doctorName: 'Dr. Sara',
          phoneNumber: '01012345679',
          governate: 'الإسكندرية',
          address: '456 Oak Ave',
          representativeName: 'Sara Rep',
          representativeCode: 'REP002',
        },
        {
          id: 3,
          pharmcyName: 'Modern Pharmacy',
          doctorName: 'Dr. Omar',
          phoneNumber: '01012345680',
          governate: 'الجيزة',
          address: '789 Pine Rd',
          representativeName: 'Omar Rep',
          representativeCode: 'REP003',
        },
      ];
      this.filteredPharmacies = [...this.pharmacies]; // Initialize filtered array

      this.currentPage = 1;
      this.pageSize = 10;
      this.totalCount = 3;
      this.totalPages = 1;

      console.log('Static data loaded, count:', this.pharmacies.length);
      this.cdr.detectChanges();
    });
  }

  loadRepresentativeInfo() {
    // Load representative information for each pharmacy using pharmacy details API
    this.pharmacies.forEach((pharmacy, index) => {
      this.pharmacyService.getPharmacyDetails(pharmacy.id).subscribe({
        next: (pharmacyDetails) => {
          console.log(`Pharmacy ${pharmacy.id} details:`, pharmacyDetails);

          if (pharmacyDetails && pharmacyDetails.representativeName) {
            // Check if representative name is not a placeholder
            if (
              pharmacyDetails.representativeName !== 'string' &&
              pharmacyDetails.representativeName.trim() !== ''
            ) {
              this.pharmacies[index].representativeName =
                pharmacyDetails.representativeName;
              this.pharmacies[index].representativeCode =
                pharmacyDetails.representativeCode || '';
            } else {
              this.pharmacies[index].representativeName = 'No Representative';
              this.pharmacies[index].representativeCode = '';
            }
          } else {
            this.pharmacies[index].representativeName = 'No Representative';
            this.pharmacies[index].representativeCode = '';
          }

          console.log(
            `Updated pharmacy ${pharmacy.id} representative:`,
            this.pharmacies[index].representativeName
          );
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(
            `Error loading pharmacy details for pharmacy ${pharmacy.id}:`,
            error
          );
          this.pharmacies[index].representativeName = 'No Representative';
          this.pharmacies[index].representativeCode = '';
          this.cdr.detectChanges();
        },
      });
    });
  }

  onPharmacyClick(pharmacyId: number) {
    console.log('Pharmacy clicked:', pharmacyId);
    this.selectedPharmacyId = pharmacyId;
    this.showDetails = true;
    this.loadPharmacyDetails(pharmacyId);
  }

  loadPharmacyDetails(pharmacyId: number) {
    console.log('Loading pharmacy details for ID:', pharmacyId);
    this.loadingDetails = true;
    this.pharmacyDetails = null; // Reset details
    this.cdr.detectChanges();

    // Call the pharmacy details API
    this.pharmacyService.getPharmacyDetails(pharmacyId).subscribe({
      next: (details) => {
        console.log('Pharmacy details received:', details);

        this.ngZone.run(() => {
          this.pharmacyDetails = details;
          this.loadingDetails = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error loading pharmacy details:', error);
        this.ngZone.run(() => {
          this.loadingDetails = false;
          this.pharmacyDetails = null;
          this.cdr.detectChanges();
        });
      },
    });
  }

  closeDetails() {
    this.showDetails = false;
    this.selectedPharmacyId = null;
    this.pharmacyDetails = null;
    this.cdr.detectChanges();
  }

  onPageChange(page: number): void {
    console.log(
      `onPageChange called with page: ${page}, currentPage: ${this.currentPage}, totalPages: ${this.totalPages}`
    );
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      console.log(`Changing to page ${page}`);
      this.currentPage = page;
      this.loadPharmacies();
    } else {
      console.log(
        `Page change rejected: page=${page}, currentPage=${this.currentPage}, totalPages=${this.totalPages}`
      );
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Make Math available to template
  get Math(): Math {
    return Math;
  }

  // Orders methods
  onViewOrders(pharmacyId: number) {
    console.log('View orders clicked for pharmacy:', pharmacyId);

    // Reset all orders-related state
    this.orders = [];
    this.ordersCurrentPage = 1;
    this.ordersTotalCount = 0;
    this.ordersTotalPages = 0;
    this.selectedOrder = null;
    this.showOrderDetails = false;

    this.selectedPharmacyId = pharmacyId;
    this.showOrders = true;

    // Trigger change detection before loading orders
    this.cdr.detectChanges();

    // Load orders after state is reset
    this.loadOrders(pharmacyId);
  }

  loadOrders(pharmacyId: number) {
    console.log('Loading orders for pharmacy ID:', pharmacyId);

    // Ensure we're loading orders for the correct pharmacy
    if (this.selectedPharmacyId !== pharmacyId) {
      console.warn('Pharmacy ID mismatch, aborting orders load');
      return;
    }

    this.loadingOrders = true;
    this.cdr.detectChanges();

    // Add a timeout safety mechanism to prevent stuck spinner
    const timeoutId = setTimeout(() => {
      console.warn('Orders loading timeout - resetting loading state');
      this.ngZone.run(() => {
        this.loadingOrders = false;
        this.cdr.detectChanges();
      });
    }, 10000); // 10 second timeout

    // Call the orders API
    this.pharmacyService
      .getPharmacyOrders(
        pharmacyId,
        this.ordersCurrentPage,
        this.ordersPageSize
      )
      .subscribe({
        next: (response) => {
          console.log('Orders received:', response);
          clearTimeout(timeoutId); // Clear timeout on success

          this.ngZone.run(() => {
            // Double-check that we're still loading orders for the same pharmacy
            if (this.selectedPharmacyId === pharmacyId) {
              this.orders = response.result?.items || [];
              this.ordersCurrentPage = response.result?.pageNumber || 1;
              this.ordersPageSize = response.result?.pageSize || 15;
              this.ordersTotalCount = response.result?.totalCount || 0;
              this.ordersTotalPages = response.result?.totalPages || 0;
              console.log(
                `Orders loaded: ${this.orders.length} items for pharmacy ${pharmacyId}`
              );
            } else {
              console.warn(
                'Pharmacy changed during orders load, discarding response'
              );
            }
            this.loadingOrders = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          clearTimeout(timeoutId); // Clear timeout on error

          this.ngZone.run(() => {
            this.loadingOrders = false;
            this.orders = [];
            this.cdr.detectChanges();
          });
        },
      });
  }

  onOrderClick(order: any) {
    console.log('Order clicked:', order);
    this.selectedOrder = order;
    this.showOrderDetails = true;
    this.cdr.detectChanges();
  }

  closeOrderDetails() {
    this.showOrderDetails = false;
    this.selectedOrder = null;
    this.cdr.detectChanges();
  }

  closeOrders() {
    console.log('Closing orders view');
    this.showOrders = false;
    this.selectedPharmacyId = null;
    this.orders = [];
    this.ordersCurrentPage = 1;
    this.ordersTotalCount = 0;
    this.ordersTotalPages = 0;
    this.selectedOrder = null;
    this.showOrderDetails = false;
    this.loadingOrders = false;
    this.cdr.detectChanges();
  }

  onOrdersPageChange(page: number): void {
    console.log(`Orders page change to: ${page}`);
    if (
      page >= 1 &&
      page <= this.ordersTotalPages &&
      page !== this.ordersCurrentPage &&
      this.selectedPharmacyId
    ) {
      this.ordersCurrentPage = page;
      this.loadOrders(this.selectedPharmacyId);
    }
  }

  getOrdersPageNumbers(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(1, this.ordersCurrentPage - 2);
    const endPage = Math.min(this.ordersTotalPages, this.ordersCurrentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'badge-success';
      case 'ordered':
        return 'badge-primary';
      case 'processing':
        return 'badge-warning';
      case 'cancelled':
        return 'badge-danger';
      case 'shipped':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Debug method to log current orders state
  logOrdersState() {
    console.log('=== ORDERS STATE DEBUG ===');
    console.log('Orders array:', this.orders);
    console.log('Orders length:', this.orders.length);
    console.log('Show orders:', this.showOrders);
    console.log('Loading orders:', this.loadingOrders);
    console.log('Selected pharmacy ID:', this.selectedPharmacyId);
    console.log('Orders current page:', this.ordersCurrentPage);
    console.log('Orders total pages:', this.ordersTotalPages);
    console.log('Orders total count:', this.ordersTotalCount);
    console.log('========================');
  }

  // Search methods
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPharmacies = [...this.pharmacies];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredPharmacies = this.pharmacies.filter(
        (pharmacy) =>
          (pharmacy.pharmcyName &&
            pharmacy.pharmcyName.toLowerCase().includes(searchLower)) ||
          (pharmacy.doctorName &&
            pharmacy.doctorName.toLowerCase().includes(searchLower)) ||
          (pharmacy.phoneNumber &&
            pharmacy.phoneNumber.toLowerCase().includes(searchLower)) ||
          (pharmacy.governate &&
            pharmacy.governate.toLowerCase().includes(searchLower)) ||
          (pharmacy.address &&
            pharmacy.address.toLowerCase().includes(searchLower)) ||
          (pharmacy.representativeName &&
            pharmacy.representativeName.toLowerCase().includes(searchLower)) ||
          (pharmacy.representativeCode &&
            pharmacy.representativeCode.toLowerCase().includes(searchLower))
      );
    }
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredPharmacies = [...this.pharmacies];
    this.cdr.detectChanges();
  }
}
