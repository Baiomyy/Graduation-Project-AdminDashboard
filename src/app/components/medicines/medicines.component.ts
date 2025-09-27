import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MedicineService, Medicine } from '../../services/medicine.service';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './medicines.component.html',
  styleUrl: './medicines.scss',
})
export class Medicines implements OnInit {
  medicines: Medicine[] = [];
  filteredMedicines: Medicine[] = [];
  loading = false;
  error = '';
  showAddForm = false;
  showEditForm = false;
  editingMedicine: Medicine | null = null;
  searchTerm = '';
  // Server-side pagination state
  pageNumber = 1;
  pageSize = 100;
  totalCount = 0;
  totalPages = 0;

  medicineForm: FormGroup;

  medicineImagePreview: string | ArrayBuffer | null = null;
  selectedMedicineImageFile: File | null = null;

  constructor(
    private medicineService: MedicineService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.medicineForm = this.fb.group({
      englishMedicineName: ['', Validators.required],
      arabicMedicineName: [''],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      drug: [0],
      imageUrl: [''],
    });
  }

  ngOnInit(): void {
    console.log('Medicines component initialized');
    this.loadPage(1);
  }

  onMedicineImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedMedicineImageFile = input.files[0];

      const reader = new FileReader();
      reader.onload = (e) => (this.medicineImagePreview = reader.result);
      reader.readAsDataURL(this.selectedMedicineImageFile);
    }
  }

  loadPage(page: number): void {
    console.log(
      'Loading page:',
      page,
      'size:',
      this.pageSize,
      'search:',
      this.searchTerm
    );
    this.loading = true;
    this.error = '';

    this.medicineService
      .getMedicinesPage(page, this.pageSize, this.searchTerm)
      .subscribe({
        next: (response) => {
          console.log('Medicines page loaded:', response);
          this.pageNumber = response.pageNumber;
          this.totalPages = response.totalPages;
          this.totalCount = response.totalCount;
          // Keep a copy of current page in both arrays for compatibility
          this.medicines = response.items;
          this.filteredMedicines = [...response.items];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading medicines page:', error);
          this.error = 'Failed to load medicines: ' + (error.message || error);
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // Trigger a fresh server query starting from page 1 when search changes
  onSearchChange(): void {
    this.pageNumber = 1;
    this.loadPage(this.pageNumber);
  }

  goToPreviousPage(): void {
    if (this.pageNumber > 1 && !this.loading) {
      this.loadPage(this.pageNumber - 1);
    }
  }

  goToNextPage(): void {
    if (this.pageNumber < this.totalPages && !this.loading) {
      this.loadPage(this.pageNumber + 1);
    }
  }

  showAddMedicineForm(): void {
    console.log('Showing add medicine form');
    this.showAddForm = true;
    this.showEditForm = false;
    this.editingMedicine = null;
    this.medicineForm.reset({
      englishMedicineName: '',
      arabicMedicineName: '',
      description: '',
      price: 0,
      drug: 0,
      imageUrl: '',
    });
  }

  showEditMedicineForm(medicine: Medicine): void {
    console.log('Showing edit medicine form for:', medicine);
    this.showEditForm = true;
    this.showAddForm = false;
    this.editingMedicine = medicine;
    this.cdr.detectChanges();

    // Reset form and set values
    this.medicineForm.reset({
      englishMedicineName: medicine.englishMedicineName || '',
      arabicMedicineName: medicine.arabicMedicineName || '',
      description: medicine.description || '',
      price: medicine.price || 0,
      drug: medicine.drug || 0,
      imageUrl: medicine.imageUrl || '',
    });
  }

  cancelForm(): void {
    console.log('Canceling form');
    this.showAddForm = false;
    this.showEditForm = false;
    this.editingMedicine = null;
    this.medicineForm.reset({
      englishMedicineName: '',
      arabicMedicineName: '',
      description: '',
      price: 0,
      drug: 0,
      imageUrl: '',
    });
  }
  addMedicine(): void {
    console.log('Adding medicine, form valid:', this.medicineForm.valid);

    if (this.medicineForm.valid) {
      const formValue = this.medicineForm.value;

      console.log(
        'New medicine form values being sent:',
        JSON.stringify(formValue, null, 2)
      );
      this.loading = true;

      this.medicineService
        .createMedicine(formValue, this.selectedMedicineImageFile)
        .subscribe({
          next: (medicine) => {
            console.log('Medicine created successfully:', medicine);

            // Reload current page to reflect new data (server is source of truth)
            this.loadPage(this.pageNumber);

            this.cancelForm();
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error creating medicine:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message,
              url: error.url,
            });

            // Handle different types of errors
            let errorMessage = 'Failed to add medicine';
            if (error.status === 400) {
              if (typeof error.error === 'string') {
                errorMessage = `Validation error: ${error.error}`;
              } else if (error.error && typeof error.error === 'object') {
                errorMessage = `Validation error: ${JSON.stringify(
                  error.error
                )}`;
              } else {
                errorMessage =
                  'Invalid input data. Please check all required fields.';
              }
            } else if (error.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            } else {
              errorMessage = `Error: ${
                error.message || 'Unknown error occurred'
              }`;
            }

            this.error = errorMessage;
            this.loading = false;
            this.cdr.detectChanges();
          },
        });
    } else {
      console.log('Form is invalid:', this.medicineForm.errors);
      console.log('Form values:', this.medicineForm.value);
      console.log('Form status:', this.medicineForm.status);
    }
  }

  updateMedicine(): void {
    console.log('Updating medicine, form valid:', this.medicineForm.valid);

    if (this.medicineForm.valid && this.editingMedicine?.medicineId) {
      const formValue = this.medicineForm.value;

      console.log('Form value before sending:', formValue);
      this.loading = true;

      this.medicineService
        .updateMedicine(
          this.editingMedicine.medicineId,
          formValue,
          this.selectedMedicineImageFile // ⬅️ image file from file input
        )
        .subscribe({
          next: (medicine) => {
            console.log('Medicine updated successfully:', medicine);

            // Reload current page to ensure data consistency
            this.loadPage(this.pageNumber);

            this.cancelForm();
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Failed to update medicine:', error);
            this.error =
              'Failed to update medicine: ' + (error.message || error);
            this.loading = false;
            this.cdr.detectChanges();
          },
        });
    } else {
      console.log(
        'Form is invalid or no editing medicine:',
        this.medicineForm.errors
      );
    }
  }

  deleteMedicine(id: number): void {
    console.log('Deleting medicine with ID:', id);
    if (confirm('Are you sure you want to delete this medicine?')) {
      this.loading = true;

      this.medicineService.deleteMedicine(id).subscribe({
        next: () => {
          console.log('Medicine deleted successfully');
          // Reload current page; if last item on page removed, adjust page if needed
          const nextPage =
            this.medicines.length === 1 && this.pageNumber > 1
              ? this.pageNumber - 1
              : this.pageNumber;
          this.loadPage(nextPage);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to delete medicine:', error);
          this.error = 'Failed to delete medicine: ' + (error.message || error);
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  clearError(): void {
    this.error = '';
  }
}
