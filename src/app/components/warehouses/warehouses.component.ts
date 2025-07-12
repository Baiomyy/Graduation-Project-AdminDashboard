import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  WarehouseService,
  Warehouse,
  WarehouseDetails,
  WarehouseMedicine,
  WarehouseOrder,
  Governorate,
  Area,
  WarehouseCustomDetails, // <-- add this import
} from '../../services/warehouse.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './warehouses.component.html',
  styleUrls: ['./warehouses.scss'],
})
export class Warehouses implements OnInit, OnDestroy {
  // Warehouse list properties
  warehouses: Warehouse[] = [];
  currentPage: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  totalPages: number = 0;
  loading: boolean = false;

  // Filter properties
  governorates: Governorate[] = [];
  selectedGovernorate: string = '';
  selectedArea: string = '';
  selectedAreaId: number = 0; // 0 means no specific area selected (use GetAll endpoint)
  areas: Area[] = [];
  isUsingGetAll: boolean = true; // Track if we're using GetAll endpoint (no pagination)

  // Warehouse form area properties
  warehouseAreas: Area[] = [];
  selectedWarehouseAreas: number[] = [];
  warehouseLocationAreas: Area[] = []; // Areas for warehouse location

  // Warehouse details properties
  selectedWarehouseId: number | null = null;
  warehouseDetails: WarehouseCustomDetails | null = null;
  showDetails: boolean = false;
  loadingDetails: boolean = false;

  // Medicines properties
  medicines: WarehouseMedicine[] = [];
  showMedicines: boolean = false;
  loadingMedicines: boolean = false;
  medicinesCurrentPage: number = 1;
  medicinesPageSize: number = 10;
  medicinesTotalCount: number = 0;
  medicinesSearchTerm: string = '';
  medicinesDrugTypeFilter: string = '';
  filteredMedicines: WarehouseMedicine[] = [];

  // Orders properties
  orders: WarehouseOrder[] = [];
  showOrders: boolean = false;
  loadingOrders: boolean = false;
  ordersCurrentPage: number = 1;
  ordersPageSize: number = 10;
  ordersTotalCount: number = 0;

  // Form properties
  showAddForm: boolean = false;
  showEditForm: boolean = false;
  showMedicineForm: boolean = false;
  warehouseForm: FormGroup;
  medicineForm: FormGroup;
  selectedMedicine: WarehouseMedicine | null = null;

  // Excel upload properties
  selectedFile: File | null = null;
  uploadingExcel: boolean = false;

  // Feedback modal properties
  showSuccessModal: boolean = false;
  showErrorModal: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  // New API governorate/area properties
  pharmacyGovernorates: any[] = [];
  pharmacyAreas: any[] = [];
  selectedPharmacyGovernorateId: number | null = null;
  selectedPharmacyAreaId: number | null = null;

  // Minimum price per selected delivery area
  selectedWarehouseAreasWithPrice: { areaId: number; minmumPrice: number }[] =
    [];

  private subscription: Subscription = new Subscription();

  constructor(
    private warehouseService: WarehouseService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.warehouseForm = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      governate: ['', Validators.required],
      warehouseLocationArea: ['', Validators.required], // Warehouse location area
      imageUrl: [''],
      isTrusted: [false],
      isWarehouseApproved: [false],
      selectedAreas: [[]], // For storing selected delivery area IDs
    });

    this.medicineForm = this.fb.group({
      medicineId: [0, Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      discount: [
        0,
        [Validators.required, Validators.min(0), Validators.max(1)],
      ],
    });
  }

  ngOnInit(): void {
    console.log('WarehousesComponent initialized');
    this.loadPharmacyGovernorates();
    this.loadWarehouses();
    // Fix dropdown text display after a short delay (only in browser)
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        this.fixDropdownTextDisplay();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    console.log('WarehousesComponent destroyed');
    this.subscription.unsubscribe();
  }

  // Load governorates from Pharmacy/register API
  loadPharmacyGovernorates(): void {
    this.warehouseService.getAllGovernoratesPharmacyApi().subscribe({
      next: (governorates) => {
        this.pharmacyGovernorates = governorates;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading pharmacy governorates:', error);
      },
    });
  }

  // When a governorate is selected, load its areas from Pharmacy/register API
  onPharmacyGovernorateChange(): void {
    this.selectedPharmacyAreaId = null;
    this.pharmacyAreas = [];
    if (this.selectedPharmacyGovernorateId) {
      this.warehouseService
        .getAreasByGovernorateIdPharmacyApi(this.selectedPharmacyGovernorateId)
        .subscribe({
          next: (areas) => {
            this.pharmacyAreas = areas;
            this.cdr.detectChanges();
            // Load warehouses after areas are loaded
            this.loadWarehouses();
          },
          error: (error) => {
            console.error('Error loading pharmacy areas:', error);
            // Still load warehouses even if areas fail to load
            this.loadWarehouses();
          },
        });
    } else {
      // If no governorate selected, load all warehouses
      this.loadWarehouses();
    }
  }

  // When an area is selected
  onPharmacyAreaChange(): void {
    this.loadWarehouses();
  }

  // Handle governorate change in the add/edit warehouse form
  onPharmacyFormGovernorateChange(): void {
    const selectedGovId = this.warehouseForm.get('governate')?.value;
    this.warehouseForm.get('warehouseLocationArea')?.setValue(null); // Reset area
    this.pharmacyAreas = [];
    if (selectedGovId) {
      this.warehouseService
        .getAreasByGovernorateIdPharmacyApi(selectedGovId)
        .subscribe({
          next: (areas) => {
            this.pharmacyAreas = areas;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading pharmacy areas for form:', error);
          },
        });
    }
  }

  // Warehouse form area methods
  onWarehouseGovernorateChange(): void {
    const selectedGovernorate = this.warehouseForm.get('governate')?.value;
    this.selectedWarehouseAreas = []; // Reset selected areas
    this.selectedWarehouseAreasWithPrice = []; // Reset selected areas with price
    this.warehouseForm.get('warehouseLocationArea')?.setValue(''); // Reset warehouse location area

    if (selectedGovernorate) {
      // Find the governorate and get its areas
      const governorate = this.governorates.find(
        (g) => g.name === selectedGovernorate
      );
      this.warehouseAreas = governorate?.areas || [];
      this.warehouseLocationAreas = governorate?.areas || []; // Same areas for both
    } else {
      this.warehouseAreas = [];
      this.warehouseLocationAreas = [];
    }
    this.cdr.detectChanges();

    // Fix dropdown text display after areas are loaded (only in browser)
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        this.fixDropdownTextDisplay();
      }, 50);
    }
  }

  onAreaSelectionChange(area: Area, event: any): void {
    if (event.target.checked) {
      if (!this.selectedWarehouseAreas.includes(area.id)) {
        this.selectedWarehouseAreas.push(area.id);
        this.selectedWarehouseAreasWithPrice.push({
          areaId: area.id,
          minmumPrice: 0,
        });
      }
    } else {
      this.selectedWarehouseAreas = this.selectedWarehouseAreas.filter(
        (id) => id !== area.id
      );
      this.selectedWarehouseAreasWithPrice =
        this.selectedWarehouseAreasWithPrice.filter(
          (a) => a.areaId !== area.id
        );
    }
    this.cdr.detectChanges();
  }

  removeSelectedArea(areaId: number): void {
    this.selectedWarehouseAreas = this.selectedWarehouseAreas.filter(
      (id) => id !== areaId
    );
    this.selectedWarehouseAreasWithPrice =
      this.selectedWarehouseAreasWithPrice.filter((a) => a.areaId !== areaId);
    this.cdr.detectChanges();
  }

  getAreaNameById(areaId: number): string {
    const area = this.warehouseAreas.find((a) => a.id === areaId);
    return area?.name || 'Unknown Area';
  }

  // Handle area selection change for pharmacy areas
  onPharmacyAreaSelectionChange(area: any, event: any): void {
    console.log(
      'Area selection changed:',
      area,
      'Checked:',
      event.target.checked
    );

    if (event.target.checked) {
      if (!this.selectedWarehouseAreas.includes(area.id)) {
        this.selectedWarehouseAreas.push(area.id);
        this.selectedWarehouseAreasWithPrice.push({
          areaId: area.id,
          minmumPrice: 0,
        });
        console.log('Area added:', area.name, 'ID:', area.id);
        console.log('Selected areas:', this.selectedWarehouseAreas);
        console.log(
          'Selected areas with price:',
          this.selectedWarehouseAreasWithPrice
        );
      }
    } else {
      this.selectedWarehouseAreas = this.selectedWarehouseAreas.filter(
        (id) => id !== area.id
      );
      this.selectedWarehouseAreasWithPrice =
        this.selectedWarehouseAreasWithPrice.filter(
          (a) => a.areaId !== area.id
        );
      console.log('Area removed:', area.name, 'ID:', area.id);
      console.log('Selected areas:', this.selectedWarehouseAreas);
      console.log(
        'Selected areas with price:',
        this.selectedWarehouseAreasWithPrice
      );
    }
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  // Remove selected pharmacy area
  removeSelectedPharmacyArea(areaId: number): void {
    this.selectedWarehouseAreas = this.selectedWarehouseAreas.filter(
      (id) => id !== areaId
    );
    this.selectedWarehouseAreasWithPrice =
      this.selectedWarehouseAreasWithPrice.filter((a) => a.areaId !== areaId);
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  // Get pharmacy area name by ID
  getPharmacyAreaNameById(areaId: number): string {
    const area = this.pharmacyAreas.find((a) => a.id === areaId);
    return area?.name || 'Unknown Area';
  }

  loadWarehouses(): void {
    console.log('loadWarehouses() method called');
    // Update selectedAreaId based on pharmacy area selection
    this.selectedAreaId =
      this.selectedPharmacyAreaId && this.selectedPharmacyAreaId > 0
        ? this.selectedPharmacyAreaId
        : 0;

    // Determine if we're using GetAll endpoint (no area selected) or area-specific endpoint
    this.isUsingGetAll =
      !this.selectedPharmacyAreaId || this.selectedPharmacyAreaId === 0;

    console.log('Loading warehouses with filters:', {
      pharmacyGovernorateId: this.selectedPharmacyGovernorateId,
      pharmacyAreaId: this.selectedPharmacyAreaId,
      selectedAreaId: this.selectedAreaId,
      isUsingGetAll: this.isUsingGetAll,
    });
    this.loading = true;

    // If using GetAll endpoint, always use page 1 since it doesn't support pagination
    const pageToUse = this.isUsingGetAll ? 1 : this.currentPage;

    this.subscription = this.warehouseService
      .getWarehouses(
        pageToUse,
        this.pageSize,
        '', // governorate - not used with new API
        '', // area - not used with new API
        '', // search - not used with new API
        this.selectedAreaId
      )
      .subscribe({
        next: (response) => {
          console.log('Warehouse API response received:', response);
          console.log(
            'Number of warehouses in response:',
            response.items?.length || 0
          );

          this.ngZone.run(() => {
            this.warehouses = response.items || [];
            console.log(
              'Warehouses array updated with',
              this.warehouses.length,
              'items'
            );

            if (this.isUsingGetAll) {
              // For GetAll endpoint, set pagination to show all results
              this.currentPage = 1;
              this.totalCount = response.items?.length || 0;
              this.totalPages = 1; // Only one page when using GetAll
              console.log(
                'Using GetAll - Total count:',
                this.totalCount,
                'Total pages:',
                this.totalPages
              );
            } else {
              // For area-specific endpoint, use normal pagination
              this.currentPage = response.pageNumber || 1;
              this.totalCount = response.totalCount || 0;
              this.totalPages = response.totalPages || 0;
              console.log(
                'Using area-specific - Page:',
                this.currentPage,
                'Total count:',
                this.totalCount,
                'Total pages:',
                this.totalPages
              );
            }

            this.pageSize = response.pageSize || 10;
            this.loading = false;
            console.log('Final warehouses array:', this.warehouses);
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading warehouses:', error);
          this.ngZone.run(() => {
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  onPageChange(page: number): void {
    // Don't allow page changes when using GetAll endpoint (no pagination)
    if (this.isUsingGetAll) {
      console.log('Pagination not supported for GetAll endpoint');
      return;
    }

    this.currentPage = page;
    this.loadWarehouses();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = Math.min(5, this.totalPages);

    for (let i = 1; i <= maxPages; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Warehouse CRUD Operations
  showAddWarehouseForm(): void {
    this.showAddForm = true;
    this.warehouseForm.reset();
    this.selectedWarehouseAreas = [];
    this.selectedWarehouseAreasWithPrice = [];
    this.cdr.detectChanges();

    // Fix dropdown text display after form is shown (only in browser)
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        this.fixDropdownTextDisplay();
      }, 100);
    }
  }

  async showEditWarehouseForm(warehouse: Warehouse): Promise<void> {
    console.log('Editing warehouse:', warehouse);
    console.log('Warehouse areas:', warehouse.wareHouseAreas);
    this.showEditForm = true;
    // Find the governorate object by name
    const selectedGovernorate = this.pharmacyGovernorates.find(
      (g) => g.name === warehouse.governate
    );
    const governorateId = selectedGovernorate ? selectedGovernorate.id : null;
    this.warehouseForm.patchValue({
      name: warehouse.name,
      address: warehouse.address,
      phone: warehouse.phone,
      email: warehouse.email,
      governate: governorateId,
      imageUrl: warehouse.imageUrl,
      isTrusted: warehouse.isTrusted,
      isWarehouseApproved: warehouse.isWarehouseApproved,
    });
    this.selectedWarehouseId = warehouse.id;

    // If warehouse has existing areas, select them
    this.selectedWarehouseAreas = (warehouse.wareHouseAreas || []).map(
      (a) => a.areaId
    );
    this.selectedWarehouseAreasWithPrice = (warehouse.wareHouseAreas || []).map(
      (a) => ({
        areaId: a.areaId,
        minmumPrice: a.minmumPrice || 0,
      })
    );

    console.log(
      'Loading existing warehouse areas:',
      this.selectedWarehouseAreas
    );
    console.log(
      'Loading existing warehouse areas with prices:',
      this.selectedWarehouseAreasWithPrice
    );

    // Load areas for the selected governorate and set area after loading
    if (governorateId) {
      this.warehouseForm.get('warehouseLocationArea')?.setValue(null); // Reset area
      this.pharmacyAreas = [];
      this.warehouseService
        .getAreasByGovernorateIdPharmacyApi(governorateId)
        .subscribe({
          next: (areas) => {
            this.pharmacyAreas = areas;
            // Set the warehouse location area by name
            this.warehouseForm.patchValue({
              warehouseLocationArea: warehouse.warehouseLocationArea,
            });
            console.log('Areas loaded for edit:', areas);
            console.log(
              'Selected areas after loading:',
              this.selectedWarehouseAreas
            );
            // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
            setTimeout(() => {
              this.cdr.detectChanges();
            }, 0);
          },
          error: (error) => {
            console.error('Error loading pharmacy areas for edit:', error);
          },
        });
    }

    this.cdr.detectChanges();
    // Fix dropdown text display after form is shown (only in browser)
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        this.fixDropdownTextDisplay();
      }, 100);
    }
  }

  onSubmitWarehouse(): void {
    if (this.warehouseForm.invalid) {
      this.warehouseForm.markAllAsTouched();
      return;
    }

    // Check if at least one delivery area is selected
    if (this.selectedWarehouseAreasWithPrice.length === 0) {
      this.showErrorMessage(
        'Please select at least one delivery area for the warehouse.'
      );
      return;
    }

    const formValue = this.warehouseForm.value;
    const email = formValue.email;

    // Check if this is a new warehouse creation (not edit mode)
    if (!this.showEditForm) {
      // Check if email already exists before creating
      this.warehouseService.checkWarehouseEmailExists(email).subscribe({
        next: (emailExists) => {
          if (emailExists) {
            console.log('Email exists, showing error modal');
            this.showErrorMessage(
              'A warehouse with this email already exists. Please use a different email.'
            );
            this.cdr.detectChanges();
            this.cdr.markForCheck();
            console.log('Error modal should be shown');
            return;
          }
          // Email doesn't exist, proceed with warehouse creation
          this.proceedWithWarehouseCreation(formValue);
        },
        error: (error) => {
          console.error('Error checking email existence:', error);
          this.showErrorMessage('Error checking email. Please try again.');
        },
      });
    } else {
      // For edit mode, proceed directly without email check
      this.proceedWithWarehouseCreation(formValue);
    }
  }

  private proceedWithWarehouseCreation(formValue: any): void {
    // Convert governorate ID to name for the payload
    const governorateId = formValue.governate;
    const selectedGovernorate = this.pharmacyGovernorates.find(
      (g) => g.id === governorateId
    );
    const governorateName = selectedGovernorate ? selectedGovernorate.name : '';

    // Convert warehouse location area name to area ID for wareHouseAreas
    const warehouseLocationAreaName = formValue.warehouseLocationArea;
    const selectedArea = this.pharmacyAreas.find(
      (a) => a.name === warehouseLocationAreaName
    );
    const areaId = selectedArea ? selectedArea.id : null;

    // Add the warehouse location area to selectedWarehouseAreasWithPrice if not already present
    let finalWareHouseAreas = [...this.selectedWarehouseAreasWithPrice];
    if ((!finalWareHouseAreas || finalWareHouseAreas.length === 0) && areaId) {
      finalWareHouseAreas = [{ areaId: areaId, minmumPrice: 0 }];
    } else if (
      areaId &&
      !finalWareHouseAreas.some((a) => a.areaId === areaId)
    ) {
      finalWareHouseAreas.push({ areaId: areaId, minmumPrice: 0 });
    }

    const payload = {
      ...formValue,
      governate: governorateName, // Use the name, not the ID
      selectedWarehouseAreasWithPrice: this.selectedWarehouseAreasWithPrice, // Send areas with prices
      wareHouseMedicines: this.medicines.map((med) => ({
        medicineId: med.medicineId,
        quantity: med.quantity,
        price:
          (med as any).price !== undefined
            ? (med as any).price
            : med.medicine?.price ?? 0,
        discount: med.discount,
      })),
      id:
        this.showEditForm && this.selectedWarehouseId
          ? this.selectedWarehouseId
          : 0,
      approvedByAdminId: '',
      imageUrl: formValue.imageUrl || '',
    };

    console.log('Form values:', formValue);
    console.log('Selected warehouse areas:', this.selectedWarehouseAreas);
    console.log(
      'Selected warehouse areas with price:',
      this.selectedWarehouseAreasWithPrice
    );
    console.log('Warehouse data being sent:', payload);

    if (this.showEditForm && this.selectedWarehouseId) {
      this.warehouseService
        .updateWarehouse(this.selectedWarehouseId, payload)
        .subscribe({
          next: (updatedWarehouse) => {
            console.log('Warehouse updated:', updatedWarehouse);
            this.showSuccessMessage('Warehouse updated successfully!');
            this.closeWarehouseForm();
            this.loadWarehouses();
          },
          error: (error) => {
            console.error('Error updating warehouse:', error);
            this.showErrorMessage(
              'Failed to update warehouse. Please try again.'
            );
          },
        });
    } else {
      console.log('Creating warehouse with data:', payload);
      this.warehouseService.createWarehouse(payload).subscribe({
        next: (newWarehouse) => {
          console.log('Warehouse created successfully:', newWarehouse);
          this.showSuccessMessage('Warehouse created successfully!');
          this.closeWarehouseForm();

          // Add the new warehouse to the local list immediately
          if (newWarehouse && newWarehouse.id) {
            console.log('Adding new warehouse to local list:', newWarehouse);
            this.warehouses.unshift(newWarehouse); // Add to beginning of list
            this.totalCount++;
            this.cdr.detectChanges();
          }

          // Also refresh from server after a delay to ensure consistency
          setTimeout(() => {
            console.log('Refreshing warehouse list from server...');
            this.loadWarehouses();
          }, 1000);
        },
        error: (error) => {
          console.error('Error creating warehouse:', error);
          console.error('Error details:', error.error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          this.showErrorMessage(
            'Failed to create warehouse. Please try again.'
          );
        },
      });
    }
  }

  deleteWarehouse(warehouseId: number): void {
    if (confirm('Are you sure you want to delete this warehouse?')) {
      this.warehouseService.deleteWarehouse(warehouseId).subscribe({
        next: (success) => {
          console.log('Delete warehouse response received:', success);
          if (success) {
            console.log('Warehouse deleted successfully');
            this.showSuccessMessage('Warehouse deleted successfully');
            console.log('About to call loadWarehouses()');
            // Add a small delay to ensure modal is shown before refreshing
            setTimeout(() => {
              this.ngZone.run(() => {
                this.loadWarehouses();
              });
            }, 500);
          } else {
            console.log('Delete warehouse failed');
            this.showErrorMessage('Failed to delete warehouse');
          }
        },
        error: (error) => {
          console.error('Error deleting warehouse:', error);
          this.showErrorMessage('Error deleting warehouse. Please try again.');
        },
      });
    }
  }

  closeWarehouseForm(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.selectedWarehouseId = null;
    this.selectedWarehouseAreas = [];
    this.selectedWarehouseAreasWithPrice = [];
    this.warehouseAreas = [];
    this.warehouseLocationAreas = [];
    this.warehouseForm.reset();
    this.cdr.detectChanges();
  }

  // Warehouse Details
  onWarehouseClick(warehouseId: number): void {
    this.selectedWarehouseId = warehouseId;
    this.showDetails = true;
    this.loadWarehouseDetails(warehouseId);
  }

  loadWarehouseDetails(warehouseId: number): void {
    this.loadingDetails = true;
    this.warehouseDetails = null;
    this.cdr.detectChanges();

    this.warehouseService.getWarehouseCustomById(warehouseId).subscribe({
      next: (details) => {
        this.ngZone.run(() => {
          this.warehouseDetails = details;
          this.loadingDetails = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error loading warehouse details:', error);
        this.loadingDetails = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.warehouseDetails = null;
    this.selectedWarehouseId = null;
    this.cdr.detectChanges();
  }

  // Medicines Management
  onViewMedicines(warehouseId: number): void {
    this.selectedWarehouseId = warehouseId;
    this.showMedicines = true;
    this.medicinesCurrentPage = 1;
    this.loadWarehouseMedicines(warehouseId);
  }

  loadWarehouseMedicines(warehouseId: number): void {
    console.log('Loading medicines for warehouse:', warehouseId);
    this.loadingMedicines = true;
    this.medicines = [];
    this.cdr.detectChanges();

    this.warehouseService
      .getWarehouseMedicines(
        warehouseId,
        this.medicinesCurrentPage,
        this.medicinesPageSize
      )
      .subscribe({
        next: (response) => {
          console.log('Medicines loaded successfully:', response);
          this.ngZone.run(() => {
            this.medicines = response.items || [];
            this.medicinesTotalCount = response.totalCount || 0;
            this.applyMedicinesFilters();
            this.loadingMedicines = false;
            console.log('Medicines array updated:', this.medicines);
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading warehouse medicines:', error);
          this.ngZone.run(() => {
            this.loadingMedicines = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  applyMedicinesFilters(): void {
    let filtered = this.medicines;
    // Filter by search term (name or arabicName)
    if (this.medicinesSearchTerm && this.medicinesSearchTerm.trim() !== '') {
      const term = this.medicinesSearchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (med) =>
          med.medicine?.name?.toLowerCase().includes(term) ||
          med.medicine?.arabicName?.toLowerCase().includes(term)
      );
    }
    // Filter by drug type
    if (this.medicinesDrugTypeFilter !== '') {
      filtered = filtered.filter((med) => {
        // Cosmetic = 0, Drug = 1
        if (this.medicinesDrugTypeFilter === '0') {
          return med.medicine?.drug === 'Prescription';
        } else if (this.medicinesDrugTypeFilter === '1') {
          return med.medicine?.drug === 'Over the Counter';
        }
        return true;
      });
    }
    this.filteredMedicines = filtered;
  }

  onMedicinesSearchChange(): void {
    this.applyMedicinesFilters();
  }

  onMedicinesDrugTypeFilterChange(): void {
    this.applyMedicinesFilters();
  }

  onMedicinesPageChange(page: number): void {
    this.medicinesCurrentPage = page;
    if (this.selectedWarehouseId) {
      this.loadWarehouseMedicines(this.selectedWarehouseId);
    }
  }

  // Medicine form methods - Commented out as Excel upload is the only method
  /*
  showAddMedicineForm(): void {
    this.selectedMedicine = null;
    this.showMedicineForm = true;
    this.medicineForm.reset();
    this.cdr.detectChanges();
  }

  showEditMedicineForm(medicine: WarehouseMedicine): void {
    this.selectedMedicine = medicine;
    this.showMedicineForm = true;
    this.medicineForm.patchValue({
      medicineId: medicine.medicineId,
      quantity: medicine.quantity,
      discount: medicine.discount,
    });
    this.cdr.detectChanges();
  }

  onSubmitMedicine(): void {
    if (this.medicineForm.valid && this.selectedWarehouseId) {
      const medicineData = this.medicineForm.value;

      if (this.selectedMedicine) {
        // Update existing medicine
        this.warehouseService
          .updateWarehouseMedicine(
            this.selectedWarehouseId,
            this.selectedMedicine.medicineId,
            medicineData
          )
          .subscribe({
            next: (updatedMedicine) => {
              console.log('Medicine updated:', updatedMedicine);
              this.closeMedicineForm();
              this.loadWarehouseMedicines(this.selectedWarehouseId!);
            },
            error: (error) => {
              console.error('Error updating medicine:', error);
            },
          });
      } else {
        // Add new medicine
        this.warehouseService
          .addMedicineToWarehouse(this.selectedWarehouseId, medicineData)
          .subscribe({
            next: (newMedicine) => {
              console.log('Medicine added:', newMedicine);
              this.closeMedicineForm();
              this.loadWarehouseMedicines(this.selectedWarehouseId!);
            },
            error: (error) => {
              console.error('Error adding medicine:', error);
            },
          });
      }
    }
  }

  deleteMedicine(medicineId: number): void {
    if (
      confirm('Are you sure you want to delete this medicine?') &&
      this.selectedWarehouseId
    ) {
      this.warehouseService
        .deleteWarehouseMedicine(this.selectedWarehouseId, medicineId)
        .subscribe({
          next: (success) => {
            if (success) {
              console.log('Medicine deleted successfully');
              this.showSuccessMessage('Medicine deleted successfully');
              this.loadWarehouseMedicines(this.selectedWarehouseId!);
            } else {
              this.showErrorMessage('Failed to delete medicine');
            }
          },
          error: (error) => {
            console.error('Error deleting medicine:', error);
            this.showErrorMessage('Error deleting medicine. Please try again.');
          },
        });
    }
  }

  closeMedicineForm(): void {
    this.selectedMedicine = null;
    this.showMedicineForm = false;
    this.medicineForm.reset();
    this.cdr.detectChanges();
  }
  */

  closeMedicines(): void {
    this.showMedicines = false;
    this.medicines = [];
    this.selectedWarehouseId = null;
    this.cdr.detectChanges();
  }

  // Orders Management
  onViewOrders(warehouseId: number): void {
    this.selectedWarehouseId = warehouseId;
    this.showOrders = true;
    this.ordersCurrentPage = 1;
    this.loadWarehouseOrders(warehouseId);
  }

  loadWarehouseOrders(warehouseId: number): void {
    this.loadingOrders = true;
    this.orders = [];
    this.cdr.detectChanges();

    this.warehouseService
      .getWarehouseOrders(
        warehouseId,
        this.ordersCurrentPage,
        this.ordersPageSize
      )
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.orders = response.items || [];
            this.ordersTotalCount = response.totalCount || 0;
            this.loadingOrders = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading warehouse orders:', error);
          this.ngZone.run(() => {
            this.loadingOrders = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  onOrdersPageChange(page: number): void {
    this.ordersCurrentPage = page;
    if (this.selectedWarehouseId) {
      this.loadWarehouseOrders(this.selectedWarehouseId);
    }
  }

  closeOrders(): void {
    this.showOrders = false;
    this.orders = [];
    this.selectedWarehouseId = null;
    this.cdr.detectChanges();
  }

  // Excel Upload
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (
      file &&
      (file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'text/csv' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx'))
    ) {
      this.selectedFile = file;
    } else {
      alert('Please select a valid Excel file (.xlsx) or CSV file (.csv)');
    }
  }

  uploadExcelFile(): void {
    if (this.selectedFile && this.selectedWarehouseId) {
      this.uploadingExcel = true;
      this.cdr.detectChanges();

      this.warehouseService
        .uploadMedicinesExcel(this.selectedWarehouseId, this.selectedFile)
        .subscribe({
          next: (result) => {
            this.ngZone.run(() => {
              this.uploadingExcel = false;
              this.selectedFile = null;
              if (result.success) {
                alert(
                  `Successfully imported ${result.importedCount} medicines`
                );
                this.loadWarehouseMedicines(this.selectedWarehouseId!);
              } else {
                alert('Error importing medicines: ' + result.message);
              }
              this.cdr.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error uploading Excel file:', error);
            this.ngZone.run(() => {
              this.uploadingExcel = false;
              this.selectedFile = null;
              alert('Error uploading file. Please try again.');
              this.cdr.detectChanges();
            });
          },
        });
    }
  }

  // Orders Management
  showOrderItems(order: WarehouseOrder): void {
    // For now, just show an alert with order details
    // In a real application, you might want to show a modal with detailed order information
    const itemsList = order.items
      .map(
        (item) =>
          `${item.medicineName} - Qty: ${item.quantity} - Price: ${item.unitPrice} EGP`
      )
      .join('\n');

    alert(
      `Order Details for ${order.orderNumber}:\n\nItems:\n${itemsList}\n\nTotal Amount: ${order.totalAmount} EGP`
    );
  }

  // Utility methods
  getStatusColor(status: string | boolean | undefined): string {
    if (!status) return 'secondary';

    const statusStr = status.toString().toLowerCase();

    switch (statusStr) {
      case 'delivered':
      case 'completed':
      case 'success':
        return 'success';
      case 'ordered':
      case 'pending':
      case 'processing':
        return 'warning';
      case 'returned':
      case 'cancelled':
      case 'failed':
        return 'danger';
      case 'in transit':
      case 'shipped':
        return 'info';
      default:
        return 'secondary';
    }
  }

  getStatusText(warehouse: Warehouse): string {
    return warehouse.isTrusted ? 'Trusted' : 'Not Trusted';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US');
  }

  get Math(): Math {
    return Math;
  }

  // Fix dropdown text display
  private fixDropdownTextDisplay(): void {
    // Check if we're in a browser environment
    if (typeof document !== 'undefined') {
      const selects = document.querySelectorAll('select');
      selects.forEach((select) => {
        if (select instanceof HTMLSelectElement) {
          // Force re-render of select element
          select.style.display = 'none';
          select.offsetHeight; // Trigger reflow
          select.style.display = '';

          // Ensure proper text display
          select.style.textOverflow = 'ellipsis';
          select.style.whiteSpace = 'nowrap';
          select.style.overflow = 'hidden';
          select.style.paddingRight = '30px';
          select.style.minHeight = '38px';
          select.style.lineHeight = '1.5';
        }
      });
    }
  }

  // Show success message modal
  showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    this.cdr.detectChanges();

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      this.closeSuccessModal();
    }, 2000);
  }

  // Show error message modal
  showErrorMessage(message: string): void {
    this.errorMessage = message;
    this.showErrorModal = true;
    this.cdr.detectChanges();

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      this.closeErrorModal();
    }, 2000);
  }

  // Close success modal
  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  // Close error modal
  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }
}
