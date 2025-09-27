import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  NgZone,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgFor, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {
  RepresentativeService,
  RepresentativeDTO,
  Pharmacy,
  RepresentativePharmaciesResponse,
  Governate,
  AreaRep,
} from '../../services/representative.service';
import { OrderService } from '../../services/order.service';

// Interfaces
export type RepresentativeField =
  | 'name'
  | 'address'
  | 'governate'
  | 'email'
  | 'password'
  | 'phone'
  | 'repAreas';

export interface Representative {
  id: number;
  name: string;
  code: string;
  phoneNumber: string; // Changed from phone to phoneNumber to match service
  email: string;
  isActive: boolean;
  address?: string; // Made optional since service doesn't have it
  governate?: string; // Made optional since service doesn't have it
}

export interface Notification {
  type: 'success' | 'error';
  message: string;
}

export interface ValidationErrors {
  [key: string]: string[];
}

@Component({
  selector: 'app-representative',
  standalone: true,
  imports: [NgFor, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './representative.component.html',
  styleUrl: './representative.scss',
})
export class RepresentativeComponent implements OnInit, OnDestroy {
  // Component state
  representatives: Representative[] = [];
  filteredRepresentatives: Representative[] = []; // Add filtered array
  pharmacies: Pharmacy[] = [];
  filteredPharmacies: Pharmacy[] = []; // Add filtered pharmacies array
  governates: Governate[] = [];
  areas: AreaRep[] = [];
  selectedAreas: number[] = []; // Changed back to array for multiple selection
  showAddModal = false;
  showDeleteModal = false;
  submitting = false;
  deleting = false;

  // Search properties
  searchTerm: string = '';
  pharmacySearchTerm: string = '';

  // New properties for pharmacy view
  isShowingPharmacies = false;
  selectedRepresentative: Representative | null = null;
  pharmaciesResponse: RepresentativePharmaciesResponse | null = null;
  loadingPharmacies = false; // Separate loading state for pharmacies
  loadingAreas = false;
  @ViewChild('areasSelect', { static: false })
  areasSelect!: ElementRef<HTMLSelectElement>;

  fields: RepresentativeField[] = [
    'name',
    'address',
    'governate',
    'email',
    'password',
    'phone',
    'repAreas',
  ];
  newRepresentative: RepresentativeDTO = this.getEmptyRepresentative();
  deleteIndex: number | null = null;
  notification: Notification | null = null;
  validationErrors: ValidationErrors = {};
  private originalErrorHandler:
    | ((
        message?: any,
        source?: any,
        lineno?: any,
        colno?: any,
        error?: any
      ) => boolean)
    | null = null;

  constructor(
    private representativeService: RepresentativeService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadRepresentatives();
    this.loadGovernates();
    // Prevent tooltip initialization errors only in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.preventTooltipErrors();
      this.disableGlobalTooltips();
      this.setupGlobalErrorSuppression();
    }
  }

  ngOnDestroy(): void {
    // Clean up any potential tooltip instances only in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.cleanupTooltips();
      this.restoreErrorHandler();
    }
  }

  private cleanupTooltips(): void {
    // Try to destroy any Bootstrap tooltips that might exist
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const tooltipElements = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
      );
      tooltipElements.forEach((element) => {
        // Remove tooltip attributes to prevent initialization
        element.removeAttribute('data-bs-toggle');
        element.removeAttribute('data-bs-placement');
      });
    } catch (error) {
      // Ignore errors if tooltip cleanup fails
      console.warn('Tooltip cleanup failed:', error);
    }
  }

  private preventTooltipErrors(): void {
    // Prevent tooltip initialization on our buttons
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Remove all tooltip attributes from the entire document
      setTimeout(() => {
        // Remove from all elements with tooltip attributes
        const tooltipElements = document.querySelectorAll(
          '[data-bs-toggle], [data-toggle], [title]'
        );
        tooltipElements.forEach((element) => {
          element.removeAttribute('data-bs-toggle');
          element.removeAttribute('data-bs-placement');
          element.removeAttribute('data-toggle');
          element.removeAttribute('data-placement');
          element.removeAttribute('title');
        });

        // Also remove from buttons specifically
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach((button) => {
          button.removeAttribute('data-bs-toggle');
          button.removeAttribute('data-bs-placement');
          button.removeAttribute('data-toggle');
          button.removeAttribute('data-placement');
          button.removeAttribute('title');
        });

        // Disable any existing tooltip instances
        if (
          typeof (window as any).bootstrap !== 'undefined' &&
          (window as any).bootstrap.Tooltip
        ) {
          const tooltipInstances = document.querySelectorAll(
            '[data-bs-toggle="tooltip"]'
          );
          tooltipInstances.forEach((element) => {
            try {
              const tooltip = (window as any).bootstrap.Tooltip.getInstance(
                element
              );
              if (tooltip) {
                tooltip.dispose();
              }
            } catch (e) {
              // Ignore disposal errors
            }
          });
        }
      }, 50);
    } catch (error) {
      // Ignore errors
      console.warn('Tooltip prevention failed:', error);
    }
  }

  private disableGlobalTooltips(): void {
    // Disable global tooltip initialization to prevent errors
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Override the global tooltip function to prevent errors
      if (typeof (window as any).tooltip === 'function') {
        const originalTooltip = (window as any).tooltip;
        (window as any).tooltip = function (...args: any[]) {
          try {
            return originalTooltip.apply(this, args);
          } catch (error) {
            // Silently ignore tooltip errors
            console.warn('Tooltip error suppressed:', error);
            return null;
          }
        };
      }

      // Also try to prevent Bootstrap tooltip initialization
      if (typeof (window as any).bootstrap !== 'undefined') {
        const originalTooltip = (window as any).bootstrap.Tooltip;
        if (originalTooltip) {
          (window as any).bootstrap.Tooltip = function (
            element: any,
            options: any
          ) {
            try {
              if (element && element.querySelector) {
                return new originalTooltip(element, options);
              }
            } catch (error) {
              console.warn('Bootstrap tooltip error suppressed:', error);
            }
            return null;
          };
        }
      }

      // Add a global error handler for tooltip-related errors
      this.originalErrorHandler = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        if (
          message &&
          typeof message === 'string' &&
          (message.includes('querySelector') || message.includes('tooltip'))
        ) {
          console.warn('Tooltip-related error suppressed:', message);
          return true; // Prevent the error from being logged
        }
        // Call original error handler for other errors
        if (this.originalErrorHandler) {
          return this.originalErrorHandler(
            message,
            source,
            lineno,
            colno,
            error
          );
        }
        return false;
      };
    } catch (error) {
      console.warn('Global tooltip disable failed:', error);
    }
  }

  private setupGlobalErrorSuppression(): void {
    // More aggressive error suppression for tooltip-related errors
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Override console.error to suppress tooltip errors
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        const message = args.join(' ');
        if (
          message.includes('querySelector') ||
          message.includes('tooltip') ||
          message.includes('Cannot read properties of null')
        ) {
          console.warn('Suppressed error:', message);
          return;
        }
        originalConsoleError.apply(console, args);
      };
    } catch (error) {
      console.warn('Global error suppression setup failed:', error);
    }
  }

  private restoreErrorHandler(): void {
    // Restore the original error handler
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      if (this.originalErrorHandler) {
        window.onerror = this.originalErrorHandler;
        this.originalErrorHandler = null;
      }
    } catch (error) {
      console.warn('Error handler restore failed:', error);
    }
  }

  loadRepresentatives(): void {
    // Reset all pharmacy-related state
    this.isShowingPharmacies = false;
    this.selectedRepresentative = null;
    this.pharmaciesResponse = null;
    this.pharmacies = [];
    this.filteredPharmacies = []; // Reset filtered pharmacies
    this.submitting = false;
    this.loadingPharmacies = false; // Reset pharmacy loading state

    // Use the working endpoint directly
    this.loadRepresentativesFallback();
  }

  private loadRepresentativesFallback(): void {
    this.representativeService.getAllRepresentatives().subscribe({
      next: (data: any[]) => {
        console.log('🔍 Fallback API Response:', data);
        console.log('🔍 First representative data (fallback):', data[0]);
        console.log(
          '🔍 All fields in first rep (fallback):',
          Object.keys(data[0])
        );
        console.log(
          '🔍 Full first rep object (fallback):',
          JSON.stringify(data[0], null, 2)
        );

        // Map API response to our interface structure - only use available fields
        const mappedData: Representative[] = data.map((rep: any) => ({
          id: rep.id,
          name: rep.name,
          code: rep.code,
          phoneNumber: '', // Not available in API
          email: '', // Not available in API
          isActive: rep.isActive !== false, // Default to true if not explicitly false
          address: rep.address || '',
          governate: rep.governate || '',
        }));

        // Filter to show only active representatives
        this.representatives = mappedData.filter(
          (rep) => rep.isActive === true
        );
        this.filteredRepresentatives = [...this.representatives]; // Initialize filtered array

        console.log(
          '🔍 Processed representatives (fallback):',
          this.representatives
        );
        console.log(
          '🔍 First processed rep (fallback):',
          this.representatives[0]
        );

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading representatives:', error);
        this.representatives = [];
        this.filteredRepresentatives = [];
        this.showNotification('error', 'Failed to load representatives');
      },
    });
  }

  loadPharmaciesForRepresentative(representative: Representative): void {
    if (this.loadingPharmacies) return;
    this.selectedRepresentative = representative;
    this.loadingPharmacies = true;
    this.isShowingPharmacies = true;
    this.pharmacySearchTerm = ''; // Reset pharmacy search term
    this.cdr.detectChanges();
    this.representativeService
      .getPharmaciesByRepresentativeId(representative.id)
      .subscribe({
        next: (response: RepresentativePharmaciesResponse) => {
          this.ngZone.run(() => {
            this.pharmaciesResponse = response;
            this.pharmacies = response.pharmacies;
            this.filteredPharmacies = [...this.pharmacies]; // Initialize filtered pharmacies

            // Stop loading immediately when pharmacy data is received
            this.loadingPharmacies = false;
            this.cdr.detectChanges();

            // Fetch order count for each pharmacy asynchronously (don't block UI)
            if (this.pharmacies && this.pharmacies.length > 0) {
              this.pharmacies.forEach((pharmacy, idx) => {
                this.orderService.getOrdersByPharmacyId(pharmacy.id).subscribe({
                  next: (orderResp) => {
                    this.ngZone.run(() => {
                      this.pharmacies[idx].orderCount =
                        orderResp.result?.items?.length || 0;
                      this.filteredPharmacies[idx].orderCount =
                        this.pharmacies[idx].orderCount; // Update filtered array too
                      this.cdr.detectChanges();
                    });
                  },
                  error: () => {
                    this.ngZone.run(() => {
                      this.pharmacies[idx].orderCount = 0;
                      this.filteredPharmacies[idx].orderCount = 0; // Update filtered array too
                      this.cdr.detectChanges();
                    });
                  },
                });
              });
            }
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.loadingPharmacies = false;
            this.cdr.detectChanges(); // Ensure spinner stops on error
            this.isShowingPharmacies = false;
            this.selectedRepresentative = null;
            this.pharmaciesResponse = null;
            this.pharmacies = [];
            this.filteredPharmacies = [];
          });
          this.showNotification(
            'error',
            'Failed to load pharmacies for this representative'
          );
        },
      });
  }

  backToRepresentatives(): void {
    this.isShowingPharmacies = false;
    this.selectedRepresentative = null;
    this.pharmaciesResponse = null;
    this.pharmacies = [];
    this.filteredPharmacies = [];
    this.pharmacySearchTerm = ''; // Reset pharmacy search term
    this.submitting = false; // Ensure loading state is reset
    this.loadingPharmacies = false; // Reset pharmacy loading state
    this.cdr.detectChanges();
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.resetForm();

    // Ensure proper initialization when modal opens
    this.ngZone.run(() => {
      this.cdr.detectChanges();
    });
  }

  closeAddModal(): void {
    this.showAddModal = false;
    if (!this.submitting) {
      this.resetForm();
      this.cdr.detectChanges();
    }
  }

  openDeleteModal(index: number): void {
    // Find the actual representative in the original array
    const filteredRep = this.filteredRepresentatives[index];
    const actualIndex = this.representatives.findIndex(
      (rep) => rep.id === filteredRep.id
    );

    this.deleteIndex = actualIndex;
    this.showDeleteModal = true;
    this.cdr.detectChanges();

  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;

    this.deleteIndex = null;
    this.cdr.detectChanges();
  }

  private resetForm(): void {
    this.newRepresentative = this.getEmptyRepresentative();
    this.validationErrors = {};
    this.areas = [];
    this.selectedAreas = []; // Reset to empty array
    this.loadingAreas = false;

    // Force change detection to update the UI
    this.cdr.detectChanges();
  }

  private getEmptyRepresentative(): RepresentativeDTO {
    return {
      name: '',
      address: '',
      governate: '',
      governateId: undefined,
      repAreas: [],
      email: '',
      password: '',
      phone: '',
    };
  }

  submitAddRepresentative(): void {
    if (this.submitting) return;

    // Validate form data before submission
    if (!this.newRepresentative.name?.trim()) {
      this.showNotification('error', 'Name is required');
      return;
    }
    if (!this.newRepresentative.email?.trim()) {
      this.showNotification('error', 'Email is required');
      return;
    }
    if (!this.newRepresentative.password?.trim()) {
      this.showNotification('error', 'Password is required');
      return;
    }
    if (!this.newRepresentative.phone?.trim()) {
      this.showNotification('error', 'Phone is required');
      return;
    }
    if (!this.newRepresentative.address?.trim()) {
      this.showNotification('error', 'Address is required');
      return;
    }
    if (!this.newRepresentative.governate?.trim()) {
      this.showNotification('error', 'Governate is required');
      return;
    }

    this.submitting = true;
    this.validationErrors = {};

    console.log('=== SUBMITTING REPRESENTATIVE ===');
    console.log('Form data:', this.newRepresentative);
    console.log('Selected areas:', this.selectedAreas);

    this.representativeService
      .createRepresentative(this.newRepresentative)
      .subscribe({
        next: (response: Representative) => {
          console.log('✅ Success response:', response);
          this.submitting = false;
          this.resetForm(); // ✅ force reset the form state
          this.showAddModal = false; // ✅ force hide modal

          // Force modal closing with NgZone
          this.ngZone.run(() => {
            this.cdr.detectChanges();
            setTimeout(() => {
              this.ngZone.run(() => {
                this.cdr.detectChanges();
              });
            }, 50);
          });

          this.showNotification(
            'success',
            'Representative added successfully!'
          );
          this.loadRepresentatives(); // Refresh the list from the API after add
        },
        error: (error) => {
          console.error('❌ Error creating representative:', error);
          console.error('❌ Error details:', error.error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error message:', error.message);

          this.submitting = false;

          if (error?.error && typeof error.error === 'object') {
            this.validationErrors = error.error;
            console.log('❌ Validation errors:', this.validationErrors);

            // Log specific validation error messages
            Object.keys(this.validationErrors).forEach((field) => {
              console.log(
                `❌ ${field} validation errors:`,
                this.validationErrors[field]
              );
            });
          } else if (error?.error && typeof error.error === 'string') {
            console.log('❌ Error string:', error.error);
            this.showNotification(
              'error',
              `Failed to add representative: ${error.error}`
            );
          } else {
            this.showNotification('error', 'Failed to add representative');
          }

          this.cdr.detectChanges();
        },
      });
  }

  confirmDeleteRepresentative(): void {
    if (this.deleteIndex === null || this.deleting) return;

    const representative = this.representatives[this.deleteIndex];
    if (!representative?.id) {
      this.closeDeleteModal();
      return;
    }

    this.deleting = true;
    const repId = representative.id;
    const originalIndex = this.deleteIndex; // Store the original index

    // Remove from both arrays
    this.representatives = this.representatives.filter((r) => r.id !== repId);

    // Update filtered array - if there's a search term, re-apply the filter
    if (this.searchTerm.trim()) {
      this.onRepresentativeSearch(); // Re-apply search filter
    } else {
      this.filteredRepresentatives = [...this.representatives]; // Update filtered array
    }

    this.cdr.detectChanges();

    this.representativeService.deleteRepresentative(repId).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteIndex = null;
        this.showDeleteModal = false; // ✅ force hide modal

        // Force modal closing with NgZone
        this.ngZone.run(() => {
          this.cdr.detectChanges();
          setTimeout(() => {
            this.ngZone.run(() => {
              this.cdr.detectChanges();
              this.showNotification(
                'success',
                'Representative deleted successfully!'
              );
            });
          }, 50);
        });
      },
      error: (error) => {
        // Restore the item at the original position
        this.representatives.splice(originalIndex, 0, representative);

        // Re-apply search filter or update filtered array
        if (this.searchTerm.trim()) {
          this.onRepresentativeSearch(); // Re-apply search filter
        } else {
          this.filteredRepresentatives = [...this.representatives]; // Update filtered array
        }

        this.deleting = false;
        this.ngZone.run(() => {
          this.cdr.detectChanges();
          this.showNotification('error', 'Failed to delete representative');
        });
      },
    });
  }

  private getNextTempId(): number {
    const maxId = Math.max(0, ...this.representatives.map((r) => r.id || 0));
    return maxId + 1;
  }

  private generateTempCode(): string {
    return `TEMP-${Date.now()}`;
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    this.ngZone.run(() => {
      this.notification = { type, message };
      this.cdr.detectChanges();

      setTimeout(() => {
        this.ngZone.run(() => {
          this.notification = null;
          this.cdr.detectChanges();
        });
      }, 3000);
    });
  }

  loadGovernates(): void {
    this.representativeService.getGovernates().subscribe({
      next: (governates) => {
        this.governates = governates;
        console.log('Loaded governates:', governates);
      },
      error: (error) => {
        console.error('Error loading governates:', error);
        this.showNotification('error', 'Failed to load governates');
      },
    });
  }

  onGovernateChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const governateName = target.value;

    console.log('=== GOVERNATE CHANGE EVENT TRIGGERED ===');
    console.log('Governate changed to:', governateName);
    console.log('Available governates:', this.governates);

    const selectedGovernate = this.governates.find(
      (g) => g.name === governateName
    );
    if (selectedGovernate) {
      console.log('✅ Found selected governate:', selectedGovernate);
      this.newRepresentative.governateId = selectedGovernate.id;
      this.newRepresentative.repAreas = []; // Reset areas in the DTO
      this.selectedAreas = []; // Reset selected areas

      // Clear areas when governate changes
      this.areas = [];
      this.cdr.detectChanges();

      // Automatically load areas for the selected governate
      this.loadAreasByGovernateId(selectedGovernate.id);
    } else {
      console.log('❌ No governate selected, clearing areas');
      this.areas = [];
      this.selectedAreas = [];
      this.newRepresentative.governateId = undefined;
      this.newRepresentative.repAreas = [];
      this.cdr.detectChanges();
    }
  }

  // Load areas when dropdown is opened (fallback method)
  onAreasDropdownOpen(): void {
    if (
      this.newRepresentative.governateId &&
      this.areas.length === 0 &&
      !this.loadingAreas
    ) {
      console.log(
        '🔄 Opening areas dropdown - loading areas for governate:',
        this.newRepresentative.governateId
      );
      this.loadAreasByGovernateId(this.newRepresentative.governateId);
    }
  }

  loadAreasByGovernateId(governateId: number): void {
    console.log('=== AREAS API CALL STARTED ===');
    console.log('Loading areas for governate ID:', governateId);
    this.loadingAreas = true;
    this.areas = [];
    this.cdr.detectChanges();

    this.representativeService.getAreasByGovernateId(governateId).subscribe({
      next: (areas) => {
        console.log('✅ Areas API response received:', areas);
        // Map API response to AreaRep[] if needed
        this.areas = (areas || []).map((a: any) => ({
          id: a.id,
          areaName: a.areaName || a.name || '',
          governateId: a.governateId || a.govId || 0,
        }));
        this.loadingAreas = false;
        console.log(
          '📊 Loaded areas for governate',
          governateId,
          ':',
          this.areas
        );

        // Force change detection and update the dropdown
        this.ngZone.run(() => {
          this.cdr.detectChanges();
          this.updateDropdownAfterAreasLoad();
        });
      },
      error: (error) => {
        console.error('❌ Error loading areas:', error);
        this.loadingAreas = false;
        this.areas = [];
        this.showNotification(
          'error',
          'Failed to load areas. Please try again.'
        );
        this.cdr.detectChanges();
      },
    });
  }

  onAreaSelectionChange(event: any): void {
    const target = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(target.selectedOptions);
    const selectedAreaIds = selectedOptions.map((option) =>
      parseInt(option.value)
    );

    this.selectedAreas = selectedAreaIds;
    this.newRepresentative.repAreas = this.selectedAreas;

    console.log('Selected areas updated:', this.selectedAreas);
    this.cdr.detectChanges();
  }

  getAreaName(areaId: number): string {
    const area = this.areas.find((a) => a.id === areaId);
    return area ? area.areaName : 'Unknown Area';
  }

  removeArea(areaId: number): void {
    this.selectedAreas = this.selectedAreas.filter((id) => id !== areaId);
    this.newRepresentative.repAreas = this.selectedAreas;
    console.log(
      'Area removed:',
      areaId,
      'Remaining areas:',
      this.selectedAreas
    );
    this.cdr.detectChanges();
  }

  clearAllAreas(): void {
    this.selectedAreas = [];
    this.newRepresentative.repAreas = [];
    console.log('All areas cleared');
    this.cdr.detectChanges();
  }

  retryLoadAreas(): void {
    if (this.newRepresentative.governateId) {
      console.log(
        'Retrying to load areas for governate ID:',
        this.newRepresentative.governateId
      );
      this.loadAreasByGovernateId(this.newRepresentative.governateId);
    }
  }

  private updateDropdownAfterAreasLoad(): void {
    console.log('Auto-updating dropdown with', this.areas.length, 'areas');

    // Force change detection to update the dropdown
    this.ngZone.run(() => {
      this.cdr.detectChanges();

      // Force the dropdown to re-render
      setTimeout(() => {
        this.ngZone.run(() => {
          this.cdr.detectChanges();
          console.log('Dropdown auto-update completed');

          // Additional check to ensure dropdown is populated
          if (this.areasSelect && this.areasSelect.nativeElement) {
            const options = this.areasSelect.nativeElement.options;
            console.log('Dropdown options count:', options.length);
            console.log(
              'First few options:',
              Array.from(options)
                .slice(0, 3)
                .map((opt) => opt.text)
            );
          }
        });
      }, 100);
    });
  }

  isAreaSelected(areaId: number): boolean {
    return this.selectedAreas.includes(areaId);
  }

  trackByRepId(index: number, item: Representative): number {
    return item.id;
  }

  trackByAreaId(index: number, item: AreaRep): number {
    return item.id;
  }

  forceDropdownRefresh(): void {
    console.log('🔄 Manually forcing dropdown refresh');
    this.cdr.detectChanges();

    // Force a complete re-render of the dropdown
    setTimeout(() => {
      this.ngZone.run(() => {
        this.cdr.detectChanges();
        console.log('🔄 Manual refresh completed');

        // Check if dropdown has options
        if (this.areasSelect && this.areasSelect.nativeElement) {
          const options = this.areasSelect.nativeElement.options;
          console.log('📊 Dropdown now has', options.length, 'options');
        }
      });
    }, 100);
  }

  // Search methods
  onRepresentativeSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredRepresentatives = [...this.representatives];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredRepresentatives = this.representatives.filter(
        (rep) =>
          (rep.name && rep.name.toLowerCase().includes(searchLower)) ||
          (rep.code && rep.code.toLowerCase().includes(searchLower)) ||
          (rep.address && rep.address.toLowerCase().includes(searchLower)) ||
          (rep.governate &&
            rep.governate.toLowerCase().includes(searchLower)) ||
          (rep.email && rep.email.toLowerCase().includes(searchLower)) ||
          (rep.phoneNumber &&
            rep.phoneNumber.toLowerCase().includes(searchLower))
      );
    }
    this.cdr.detectChanges();
  }

  onPharmacySearch(): void {
    if (!this.pharmacySearchTerm.trim()) {
      this.filteredPharmacies = [...this.pharmacies];
    } else {
      const searchLower = this.pharmacySearchTerm.toLowerCase().trim();
      this.filteredPharmacies = this.pharmacies.filter(
        (pharmacy) =>
          (pharmacy.name &&
            pharmacy.name.toLowerCase().includes(searchLower)) ||
          (pharmacy.phoneNumber &&
            pharmacy.phoneNumber.toLowerCase().includes(searchLower)) ||
          (pharmacy.governate &&
            pharmacy.governate.toLowerCase().includes(searchLower)) ||
          (pharmacy.userName &&
            pharmacy.userName.toLowerCase().includes(searchLower)) ||
          (pharmacy.address &&
            pharmacy.address.toLowerCase().includes(searchLower)) ||
          (pharmacy.areaName &&
            pharmacy.areaName.toLowerCase().includes(searchLower))
      );
    }
    this.cdr.detectChanges();
  }

  clearRepresentativeSearch(): void {
    this.searchTerm = '';
    this.filteredRepresentatives = [...this.representatives];
    this.cdr.detectChanges();
  }

  clearPharmacySearch(): void {
    this.pharmacySearchTerm = '';
    this.filteredPharmacies = [...this.pharmacies];
    this.cdr.detectChanges();
  }
}
