import { Order } from './../../services/order.service';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './warehouses.component.html',
  styleUrls: ['./warehouses.scss'],
})
export class Warehouses implements OnInit, OnDestroy {
  public getInvoiceOrder(): WarehouseOrder | undefined {
    return this.orders?.find(
      (o: WarehouseOrder) => o.id === this.invoiceOrderId!
    );
  }
  invoiceData: any[] = [];
  showInvoiceModal: boolean = false;
  invoiceOrderId: number | null = null;
  invoiceError: string = '';
  // Search term for warehouse name
  warehouseSearchTerm: string = '';
  searchTerm: string = '';
  filteredWarehouses: Warehouse[] = [];
  warehouseImagePreview: string | ArrayBuffer | null = null;
  selectedWarehouseImageFile: File | null = null;
  // Warehouse list properties
  warehouses: Warehouse[] = [];
  // Handler for warehouse search input (copied from pharmacies)
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredWarehouses = [...this.warehouses];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredWarehouses = this.warehouses.filter(
        (warehouse) =>
          (warehouse.name &&
            warehouse.name.toLowerCase().includes(searchLower)) ||
          (warehouse.address &&
            warehouse.address.toLowerCase().includes(searchLower)) ||
          (warehouse.governate &&
            warehouse.governate.toLowerCase().includes(searchLower)) ||
          (warehouse.phone &&
            warehouse.phone.toLowerCase().includes(searchLower))
      );
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredWarehouses = [...this.warehouses];
  }
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
  filteredOrders: WarehouseOrder[] = [];
  showOrders: boolean = false;
  loadingOrders: boolean = false;
  ordersCurrentPage: number = 1;
  ordersPageSize: number = 10;
  ordersTotalCount: number = 0;

  orderStatusFilter: string = 'All';
  orderDateFilter: string = '';

  // Form properties
  showAddForm: boolean = false;
  showEditForm: boolean = false;
  showMedicineForm: boolean = false;
  warehouseForm!: FormGroup;
  medicineForm!: FormGroup;
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
  // Multiple delivery governorates and their areas
  selectedDeliveryGovernorateIds: number[] = [];
  deliveryAreasByGovernorate: { [govId: number]: any[] } = {};

  // Minimum price per selected delivery area
  selectedWarehouseAreasWithPrice: { areaId: number; minmumPrice: number }[] =
    [];

  private subscription: Subscription = new Subscription();

  constructor(
    private warehouseService: WarehouseService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
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
      password: ['', Validators.required],
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
    this.orderStatusFilter = 'All';
    this.filteredOrders = [...this.orders];
  }

  ngOnInit(): void {
    console.log('WarehousesComponent initialized');
    this.loadPharmacyGovernorates();
    this.loadWarehouses();
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        this.fixDropdownTextDisplay();
      }, 100);
    }
    this.filteredOrders = [...this.orders];
  }
  // Filter orders by status
  onOrderFiltersChange(): void {
    let filtered = [...this.orders];
    // Status filter
    if (this.orderStatusFilter && this.orderStatusFilter !== 'All') {
      filtered = filtered.filter(
        (order) => order.status === this.orderStatusFilter
      );
    }
    // Single date filter
    if (this.orderDateFilter) {
      filtered = filtered.filter((order) => {
        // order.orderDate format: "2025-07-06 17:23"
        const orderDateStr = order.orderDate.split(' ')[0];
        return orderDateStr === this.orderDateFilter;
      });
    }
    this.filteredOrders = filtered;
  }

  // When orders are loaded, call this to update filteredOrders
  updateFilteredOrders(): void {
    this.onOrderFiltersChange();
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
        this.cd.detectChanges();
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
            this.cd.detectChanges();
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
            this.cd.detectChanges();
          },
          error: (error) => {
            console.error('Error loading pharmacy areas for form:', error);
          },
        });
    }
  }

  // Handle change in selected delivery governorates (multi-select)
  onDeliveryGovernoratesChange(event: any): void {
    const options: HTMLOptionsCollection = event.target.options;
    const newlySelected: number[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        const val = Number(options[i].value);
        if (!isNaN(val)) newlySelected.push(val);
      }
    }
    this.applyDeliveryGovernorateSelection(newlySelected);
  }

  // Toggle handler for checkbox UI
  onToggleDeliveryGovernorate(governorateId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement)?.checked;
    const nextSelected = [...this.selectedDeliveryGovernorateIds];
    if (checked) {
      if (!nextSelected.includes(governorateId)) {
        nextSelected.push(governorateId);
      }
    } else {
      const idx = nextSelected.indexOf(governorateId);
      if (idx !== -1) {
        nextSelected.splice(idx, 1);
      }
    }
    this.applyDeliveryGovernorateSelection(nextSelected);
  }

  // Apply selection diff: load areas for added, cleanup removed
  private applyDeliveryGovernorateSelection(newlySelected: number[]): void {
    // Determine added and removed governorates
    const added = newlySelected.filter(
      (id) => !this.selectedDeliveryGovernorateIds.includes(id)
    );
    const removed = this.selectedDeliveryGovernorateIds.filter(
      (id) => !newlySelected.includes(id)
    );

    // Update selected list immediately for UI feedback
    this.selectedDeliveryGovernorateIds = newlySelected;

    // Load areas for added governorates
    added.forEach((govId) => {
      this.warehouseService
        .getAreasByGovernorateIdPharmacyApi(govId)
        .subscribe({
          next: (areas) => {
            this.deliveryAreasByGovernorate[govId] = areas;
            this.cd.detectChanges();
          },
          error: (error) => {
            console.error(
              'Error loading pharmacy areas for delivery governorate:',
              govId,
              error
            );
          },
        });
    });

    // Clean up selections for removed governorates
    removed.forEach((govId) => {
      const areas = this.deliveryAreasByGovernorate[govId] || [];
      const areaIds = new Set<number>(areas.map((a: any) => a.id));
      // Remove any selected areas that belong to this governorate
      this.selectedWarehouseAreas = this.selectedWarehouseAreas.filter(
        (id) => !areaIds.has(id)
      );
      this.selectedWarehouseAreasWithPrice =
        this.selectedWarehouseAreasWithPrice.filter(
          (a) => !areaIds.has(a.areaId)
        );
      delete this.deliveryAreasByGovernorate[govId];
    });

    this.cd.detectChanges();
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
    this.cd.detectChanges();

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
    this.cd.detectChanges();
  }

  removeSelectedArea(areaId: number): void {
    this.selectedWarehouseAreas = this.selectedWarehouseAreas.filter(
      (id) => id !== areaId
    );
    this.selectedWarehouseAreasWithPrice =
      this.selectedWarehouseAreasWithPrice.filter((a) => a.areaId !== areaId);
    this.cd.detectChanges();
  }

  getAreaNameById(areaId: number): string {
    const area = this.warehouseAreas.find((a) => a.id === areaId);
    return area?.name || 'Unknown Area';
  }

  // Handle area selection change for pharmacy areas
  onPharmacyAreaSelectionChange(area: any, event: any): void {
    const checked = (event.target as HTMLInputElement).checked;
    console.log('Area selection changed:', {
      area: area,
      areaId: area.id,
      checked: checked,
      currentSelectedAreas: [...this.selectedWarehouseAreas],
      currentAreasWithPrice: [...this.selectedWarehouseAreasWithPrice],
    });

    if (checked) {
      if (!this.selectedWarehouseAreas.includes(area.id)) {
        this.selectedWarehouseAreas.push(area.id);
        const areaWithPrice = {
          areaId: area.id,
          minmumPrice: 0,
          wareHouseId: 0, // Will be set by API
        };
        this.selectedWarehouseAreasWithPrice.push(areaWithPrice);
        console.log('Area added:', {
          area: area.name,
          id: area.id,
          areaWithPrice: areaWithPrice,
          allSelectedAreas: [...this.selectedWarehouseAreas],
          allAreasWithPrice: [...this.selectedWarehouseAreasWithPrice],
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
      console.log('Area removed:', {
        area: area.name,
        id: area.id,
        remainingAreas: [...this.selectedWarehouseAreas],
        remainingAreasWithPrice: [...this.selectedWarehouseAreasWithPrice],
      });
    }

    // Force change detection
    setTimeout(() => {
      this.cd.detectChanges();
    }, 0);
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.cd.detectChanges();
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
      this.cd.detectChanges();
    }, 0);
  }

  // Get pharmacy area name by ID
  getPharmacyAreaNameById(areaId: number): string {
    // First check current location governorate areas
    let area = this.pharmacyAreas.find((a) => a.id === areaId);
    if (area) return area.name;
    // Then check delivery governorates areas
    for (const govId of Object.keys(this.deliveryAreasByGovernorate)) {
      const list = this.deliveryAreasByGovernorate[Number(govId)] || [];
      const match = list.find((a: any) => a.id === areaId);
      if (match) return match.name;
    }
    return 'Unknown Area';
  }

  // Helper: get governorate name by ID
  getGovernorateNameById(governorateId: number): string {
    const gov = this.pharmacyGovernorates.find((g) => g.id === governorateId);
    return gov?.name || 'Unknown Governorate';
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

    // Always use currentPage for pagination, even for GetAllWithPagination
    const pageToUse = this.currentPage;

    this.subscription = this.warehouseService
      .getWarehouses(
        pageToUse,
        this.pageSize,
        '', // governorate - not used with new API
        '', // area - not used with new API
        this.warehouseSearchTerm,
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
            // Always set pagination state from API response
            this.currentPage = response.pageNumber || 1;
            this.totalCount = response.totalCount || 0;
            this.totalPages = response.totalPages || 0;
            console.log(
              'API pagination - Page:',
              this.currentPage,
              'Total count:',
              this.totalCount,
              'Total pages:',
              this.totalPages
            );

            this.pageSize = response.pageSize || 10;
            this.loading = false;
            console.log('Final warehouses array:', this.warehouses);
            this.cd.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading warehouses:', error);
          this.ngZone.run(() => {
            this.loading = false;
            this.cd.detectChanges();
          });
        },
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadWarehouses();
  }

  // Handler for warehouse search input
  onWarehouseSearchChange(): void {
    // Reset to first page when searching
    this.currentPage = 1;
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
    this.selectedDeliveryGovernorateIds = [];
    this.deliveryAreasByGovernorate = {};
    // Ensure password is required in create mode
    const pwdCtrl = this.warehouseForm.get('password');
    pwdCtrl?.setValidators([Validators.required]);
    pwdCtrl?.updateValueAndValidity();
    this.cd.detectChanges();

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
      password: '',
      isTrusted: warehouse.isTrusted,
      isWarehouseApproved: warehouse.isWarehouseApproved,
    });
    // In edit mode, password is not required and no image upload is needed
    const pwdCtrl = this.warehouseForm.get('password');
    pwdCtrl?.clearValidators();
    pwdCtrl?.updateValueAndValidity();
    // In edit mode, user should not change governorate/location area → relax validators
    const govCtrl = this.warehouseForm.get('governate');
    govCtrl?.clearValidators();
    govCtrl?.updateValueAndValidity();
    const areaCtrl = this.warehouseForm.get('warehouseLocationArea');
    areaCtrl?.clearValidators();
    areaCtrl?.updateValueAndValidity();
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
              this.cd.detectChanges();
            }, 0);
          },
          error: (error) => {
            console.error('Error loading pharmacy areas for edit:', error);
          },
        });
    }

    // Preload delivery governorates containing the selected areas
    // Include the location governorate by default if present
    const initialGovIds: number[] = [];
    if (governorateId) initialGovIds.push(governorateId);
    // For all governorates, load areas and check intersection with selected areas
    const selectedAreaIdSet = new Set<number>(this.selectedWarehouseAreas);
    this.pharmacyGovernorates.forEach((gov) => {
      this.warehouseService
        .getAreasByGovernorateIdPharmacyApi(gov.id)
        .subscribe({
          next: (areas) => {
            this.deliveryAreasByGovernorate[gov.id] = areas;
            const intersect = areas.some((a: any) =>
              selectedAreaIdSet.has(a.id)
            );
            if (
              intersect &&
              !this.selectedDeliveryGovernorateIds.includes(gov.id)
            ) {
              this.selectedDeliveryGovernorateIds.push(gov.id);
            }
            // Ensure location governorate included
            if (
              initialGovIds.includes(gov.id) &&
              !this.selectedDeliveryGovernorateIds.includes(gov.id)
            ) {
              this.selectedDeliveryGovernorateIds.push(gov.id);
            }
            this.cd.detectChanges();
          },
          error: (error) => {
            console.error(
              'Error preloading delivery areas for governorate:',
              gov.id,
              error
            );
          },
        });
    });

    this.cd.detectChanges();
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
            this.cd.detectChanges();
            this.cd.markForCheck();
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

    // Warehouse location AreaId comes directly from form (now numeric id)
    const areaId: number | null = formValue.warehouseLocationArea ?? null;

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

    // Group areas by governorate for WareHouseGovernatesJson format
    const areasByGovernorate = new Map<
      number,
      { AreaId: number; MinmumPrice: number }[]
    >();

    finalWareHouseAreas.forEach((area) => {
      for (const govId of Object.keys(this.deliveryAreasByGovernorate)) {
        const govAreas = this.deliveryAreasByGovernorate[Number(govId)] || [];
        if (govAreas.some((a: any) => a.id === area.areaId)) {
          if (!areasByGovernorate.has(Number(govId))) {
            areasByGovernorate.set(Number(govId), []);
          }
          areasByGovernorate.get(Number(govId))?.push({
            AreaId: area.areaId,
            MinmumPrice: area.minmumPrice || 0,
          });
          break;
        }
      }
    });

    const WareHouseGovernatesJson = Array.from(
      areasByGovernorate.entries()
    ).map(([GovernateId, areas]) => ({
      GovernateId,
      Areas: areas,
    }));

    // Debug logging before creating payload
    console.log('Creating warehouse with areas:', {
      selectedAreas: this.selectedWarehouseAreas,
      areasWithPrices: this.selectedWarehouseAreasWithPrice,
      WareHouseGovernatesJson,
      governorate: governorateName,
    });

    // ------------------ CREATE MODE ------------------
    if (!this.showEditForm || !this.selectedWarehouseId) {
      const fd = new FormData();
      fd.append('Name', formValue.name);
      fd.append('Address', formValue.address);
      fd.append('Email', formValue.email);
      fd.append('Password', formValue.password || '');
      fd.append('Phone', formValue.phone);
      fd.append('IsTrusted', String(!!formValue.isTrusted));
      if (governorateId != null) fd.append('GovId', String(governorateId));
      if (areaId != null) fd.append('AreaId', String(areaId));

      // Append file if selected
      if (this.selectedWarehouseImageFile) {
        fd.append(
          'Photo',
          this.selectedWarehouseImageFile,
          this.selectedWarehouseImageFile.name
        );
      }

      // Append WareHouseGovernatesJson correctly
      fd.append(
        'WareHouseGovernatesJson',
        JSON.stringify(WareHouseGovernatesJson)
      );

      // Debug dump of form data
      for (const [key, value] of fd.entries()) {
        console.log(key, value);
      }

      console.log('Creating warehouse with FormData (per swagger)');
      this.warehouseService.createWarehouse(fd).subscribe({
        next: (newWarehouse) => {
          console.log('Warehouse created successfully:', newWarehouse);
          this.showSuccessMessage('Warehouse created successfully!');
          this.closeWarehouseForm();

          if (newWarehouse && newWarehouse.id) {
            this.warehouses.unshift(newWarehouse);
            this.totalCount++;
            this.cd.detectChanges();
          }

          setTimeout(() => {
            console.log('Refreshing warehouse list from server...');
            this.loadWarehouses();
          }, 1000);
        },
        error: (error) => {
          console.error('Error creating warehouse:', error);
          console.error('Error details:', error.error);
          this.showErrorMessage(
            'Failed to create warehouse. Please try again.'
          );
        },
      });
    }
    // ------------------ EDIT MODE ------------------
    else {
      // Build JSON payload per new backend contract; no password or image on update
      // Reuse areasByGovernorate computed above to build camelCase JSON structure
      const wareHouseGovernates = Array.from(areasByGovernorate.entries()).map(
        ([govId, areas]) => ({
          governateId: Number(govId),
          areas: areas.map((a: any) => ({
            areaId: a.AreaId,
            minmumPrice: a.MinmumPrice,
            wareHouseId: this.selectedWarehouseId!,
          })),
        })
      );

      const jsonBody = {
        id: this.selectedWarehouseId!,
        name: formValue.name,
        address: formValue.address,
        isTrusted: !!formValue.isTrusted,
        email: formValue.email,
        phone: formValue.phone,
        wareHouseGovernates,
      };

      console.log(
        'Component: About to call updateWarehouseJson with body:',
        jsonBody
      );
      this.warehouseService
        .updateWarehouseJson(this.selectedWarehouseId!, jsonBody)
        .subscribe({
          next: (updatedWarehouse) => {
            console.log('Warehouse updated:', updatedWarehouse);
            this.showSuccessMessage('Warehouse updated successfully!');
            this.closeWarehouseForm();
            this.loadWarehouses();

            if (this.showDetails && this.selectedWarehouseId) {
              setTimeout(() => {
                if (this.selectedWarehouseId) {
                  this.loadWarehouseDetails(this.selectedWarehouseId);
                }
              }, 500);
            }
          },
          error: (error) => {
            console.error('Error updating warehouse:', error);
            this.showErrorMessage(
              'Failed to update warehouse. Please try again.'
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
    this.selectedDeliveryGovernorateIds = [];
    this.deliveryAreasByGovernorate = {};
    this.warehouseForm.reset();
    this.cd.detectChanges();
  }

  // Warehouse Details
  onWarehouseClick(warehouseId: number): void {
    this.selectedWarehouseId = warehouseId;
    this.showDetails = true;
    this.loadWarehouseDetails(warehouseId);
  }

  loadWarehouseDetails(warehouseId: number): void {
    console.log('Loading warehouse details for ID:', warehouseId);
    this.loadingDetails = true;
    this.warehouseDetails = null;
    this.cd.detectChanges();

    this.warehouseService.getWarehouseCustomById(warehouseId).subscribe({
      next: (details) => {
        console.log('Warehouse details received:', details);
        this.ngZone.run(() => {
          this.warehouseDetails = details;
          this.loadingDetails = false;
          this.cd.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error loading warehouse details:', error);
        this.loadingDetails = false;
        this.cd.detectChanges();
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.warehouseDetails = null;
    this.selectedWarehouseId = null;
    this.cd.detectChanges();
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
    this.cd.detectChanges();

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
            this.cd.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading warehouse medicines:', error);
          this.ngZone.run(() => {
            this.loadingMedicines = false;
            this.cd.detectChanges();
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
  this.cd.detectChanges();
  }

  showEditMedicineForm(medicine: WarehouseMedicine): void {
    this.selectedMedicine = medicine;
    this.showMedicineForm = true;
    this.medicineForm.patchValue({
      medicineId: medicine.medicineId,
      quantity: medicine.quantity,
      discount: medicine.discount,
    });
  this.cd.detectChanges();
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
  this.cd.detectChanges();
  }
  */

  closeMedicines(): void {
    this.showMedicines = false;
    this.medicines = [];
    this.selectedWarehouseId = null;
    this.cd.detectChanges();
  }

  // Orders Management
  onWarehouseImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedWarehouseImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result ?? null;
        this.warehouseImagePreview = result;
      };
      reader.readAsDataURL(input.files[0]);
    } else {
      this.selectedWarehouseImageFile = null;
      this.warehouseImagePreview = null;
    }
  }

  printOrderPdf(order: any): void {
    if (!this.invoiceData || !this.invoiceOrderId) return;
    console.log('Generating PDF for order:', order);
    const doc = new jsPDF();

    this.fetchFontAsBase64('assets/fonts/Amiri-Regular.ttf').then((base64) => {
      (doc as any).addFileToVFS('Amiri-Regular.ttf', base64);
      (doc as any).addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri');

      // ✅ Add logo if exists
      const img = new Image();
      img.src = 'assets/img/logo.jpg';
      img.onload = () => {
        doc.addImage(img, 'JPG', 160, 10, 40, 30); // right side
        addContent();
      };

      const addContent = () => {
        const pageWidth = doc.internal.pageSize.getWidth();
        // draw line across the page
        doc.setLineWidth(0.5); // thickness of line
        doc.line(10, 40, pageWidth - 10, 40); // horizontal line
        // ✅ Invoice Title
        doc.setFontSize(18);
        doc.text('Pharma At Once', 105, 30, { align: 'center' });
        doc.text('فاتورة بيع', 105, 50, { align: 'center' });

        // ✅ Customer Info
        doc.setFontSize(12);
        doc.text(`رقم الطلب: ${this.invoiceOrderId}`, 200, 70, {
          align: 'right',
        });
        doc.text(`التاريخ: ${order.orderDate}`, 200, 80, { align: 'right' });
        doc.text(`${this.invoiceData[0].wareHouseName} :مخزن`, 200, 90, {
          align: 'right',
        });
        doc.text(`${order.customerName} :صيدلية`, 200, 100, { align: 'right' });
        doc.line(10, 110, pageWidth - 10, 110); // horizontal line

        // ✅ Table Headers + Body
        autoTable(doc, {
          head: [
            [
              'م',
              'الصنف',
              'الكمية المطلوبة',
              'الكمية المصروفة',
              'السعر (ج.م)',
              'الخصم %',
              'القيمة بعد الخصم',
            ].reverse(),
          ],
          body: this.invoiceData.map((item: any, index: number) =>
            [
              index + 1,
              item.arabicMedicineName,
              item.quantity,
              item.quantity, // or actual supplied qty
              item.medicinePrice,
              `${item.discountPercentage}%`,
              item.totalPriceAfterDisccount,
            ].reverse()
          ),
          startY: 120,
          styles: { halign: 'right', font: 'Amiri', fontStyle: 'normal' },
          headStyles: { fillColor: [200, 200, 200], halign: 'center' },
          bodyStyles: {
            cellPadding: { top: 2, right: 10, bottom: 2, left: 2 }, // reduce right padding a bit
          },
        });

        // ✅ Totals under the table
        let finalY = (doc as any).lastAutoTable.finalY + 20;

        const totalBefore = this.invoiceData.reduce(
          (sum: number, i: any) => sum + i.totalPriceBeforeDisccount,
          0
        );
        const discount = this.invoiceData.reduce(
          (sum: number, i: any) => sum + i.discountAmount,
          0
        );
        const totalAfter = this.invoiceData.reduce(
          (sum: number, i: any) => sum + i.totalPriceAfterDisccount,
          0
        );

        doc.setFontSize(12);
        doc.text(
          `الإجمالي قبل الخصم: ${totalBefore.toFixed(2)} ج.م`,
          200,
          finalY,
          { align: 'right' }
        );
        finalY += 10;
        doc.text(`الخصم: ${discount.toFixed(2)} ج.م`, 200, finalY, {
          align: 'right',
        });
        finalY += 10;
        doc.line(200, finalY - 5, 130, finalY - 5);
        doc.text(`الإجمالي الكلي: ${totalAfter.toFixed(2)} ج.م`, 200, finalY, {
          align: 'right',
        });

        // ✅ Save file
        doc.save(`invoice_order_${this.invoiceOrderId}.pdf`);
      };

      // If logo fails to load, still render
      img.onerror = () => addContent();
    });
  }
  fetchFontAsBase64(url: string): Promise<string> {
    return fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk as any);
        }
        return btoa(binary);
      });
  }

  showInvoice(orderId: number): void {
    this.invoiceOrderId = orderId;
    this.showInvoiceModal = true;
    this.invoiceData = [];
    this.invoiceError = '';
    this.warehouseService.getOrderDetailsForAdminDashboard(orderId).subscribe({
      next: (response: any) => {
        if (
          response &&
          Array.isArray(response.result) &&
          response.result.length > 0
        ) {
          this.invoiceData = response.result;
          this.invoiceError = '';
        } else {
          this.invoiceData = [];
          this.invoiceError = 'No invoice data found for this order.';
        }
        console.log('invoiceData after fetch:', this.invoiceData);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching invoice data:', err);
        this.invoiceData = [];
        if (err.status === 404) {
          this.invoiceError = 'Invoice data not found for this order.';
        } else {
          this.invoiceError = 'An error occurred while fetching invoice data.';
        }
        this.cd.detectChanges();
      },
    });
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceOrderId = null;
    this.invoiceData = [];
    this.invoiceError = '';
  }
  onViewOrders(warehouseId: number): void {
    this.selectedWarehouseId = warehouseId;
    this.showOrders = true;
    this.ordersCurrentPage = 1;
    this.orderStatusFilter = 'All';
    this.orderDateFilter = '';
    this.loadWarehouseOrders(warehouseId);
  }

  loadWarehouseOrders(warehouseId: number): void {
    this.loadingOrders = true;
    this.orders = [];
    this.cd.detectChanges();

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
            this.updateFilteredOrders();
            this.loadingOrders = false;
            this.cd.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading warehouse orders:', error);
          this.ngZone.run(() => {
            this.loadingOrders = false;
            this.cd.detectChanges();
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
    this.filteredOrders = [];
    this.orderDateFilter = '';
    this.selectedWarehouseId = null;
    this.cd.detectChanges();
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
      this.cd.detectChanges();

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
              this.cd.detectChanges();
            });
          },
          error: (error) => {
            console.error('Error uploading Excel file:', error);
            this.ngZone.run(() => {
              this.uploadingExcel = false;
              this.selectedFile = null;
              alert('Error uploading file. Please try again.');
              this.cd.detectChanges();
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
  getWarehouseImageUrl(imageUrl?: string | null): string {
    if (!imageUrl) return 'assets/img/profile.jpg';
    const trimmed = String(imageUrl).trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Ensure we handle relative paths coming from backend
    const base = 'http://atoncepharma.somee.com';
    if (trimmed.startsWith('/')) {
      return base + trimmed;
    }
    return `${base}/${trimmed}`;
  }

  onWarehouseImageError(event: Event): void {
    const el = event.target as HTMLImageElement;
    el.src = 'assets/img/profile.jpg';
  }
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
    this.cd.detectChanges();

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      this.closeSuccessModal();
    }, 2000);
  }

  // Show error message modal
  showErrorMessage(message: string): void {
    this.errorMessage = message;
    this.showErrorModal = true;
    this.cd.detectChanges();

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      this.closeErrorModal();
    }, 2000);
  }

  // Close success modal
  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.cd.detectChanges();
  }

  // Close error modal
  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cd.detectChanges();
  }
}
