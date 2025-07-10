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
  sortBy = '';

  medicineForm: FormGroup;

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
      medicineUrl: [''],
    });
  }

  ngOnInit(): void {
    console.log('Medicines component initialized');
    this.loadMedicines();
  }

  loadMedicines(): void {
    console.log('Loading medicines...');
    this.loading = true;
    this.error = '';

    this.medicineService.getAllMedicines().subscribe({
      next: (medicines) => {
        console.log('Medicines loaded:', medicines);
        this.medicines = medicines;
        this.filteredMedicines = [...medicines];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading medicines:', error);
        this.error = 'Failed to load medicines: ' + (error.message || error);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  searchMedicines(): void {
    console.log('Searching medicines with term:', this.searchTerm);
    if (!this.searchTerm.trim()) {
      this.filteredMedicines = [...this.medicines];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredMedicines = this.medicines.filter(
      (medicine) =>
        medicine.englishMedicineName?.toLowerCase().includes(searchLower) ||
        medicine.arabicMedicineName?.toLowerCase().includes(searchLower) ||
        medicine.description?.toLowerCase().includes(searchLower)
    );
    this.cdr.detectChanges();
  }

  filterMedicines(): void {
    console.log('Filtering medicines by:', this.sortBy);
    if (!this.sortBy) {
      this.filteredMedicines = [...this.medicines];
      return;
    }

    this.filteredMedicines = [...this.medicines].sort((a, b) => {
      switch (this.sortBy) {
        case 'priceAsc':
          return (a.price || 0) - (b.price || 0);
        case 'priceDesc':
          return (b.price || 0) - (a.price || 0);
        case 'nameAsc':
          return (a.englishMedicineName || '').localeCompare(
            b.englishMedicineName || ''
          );
        case 'nameDesc':
          return (b.englishMedicineName || '').localeCompare(
            a.englishMedicineName || ''
          );
        default:
          return 0;
      }
    });
    this.cdr.detectChanges();
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
      medicineUrl: '',
    });
  }

  showEditMedicineForm(medicine: Medicine): void {
    console.log('Showing edit medicine form for:', medicine);
    this.showEditForm = true;
    this.showAddForm = false;
    this.editingMedicine = medicine;

    // Reset form and set values
    this.medicineForm.reset({
      englishMedicineName: medicine.englishMedicineName || '',
      arabicMedicineName: medicine.arabicMedicineName || '',
      description: medicine.description || '',
      price: medicine.price || 0,
      drug: medicine.drug || 0,
      medicineUrl: medicine.medicineUrl || '',
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
      medicineUrl: '',
    });
  }

  addMedicine(): void {
    console.log('Adding medicine, form valid:', this.medicineForm.valid);
    if (this.medicineForm.valid) {
      const newMedicine = this.medicineForm.value;
      console.log('New medicine data:', newMedicine);
      this.loading = true;

      this.medicineService.createMedicine(newMedicine).subscribe({
        next: (medicine) => {
          console.log('Medicine created successfully:', medicine);
          // Add to bottom of both arrays
          this.medicines.push(medicine);
          this.filteredMedicines.push(medicine);
          this.cancelForm();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error creating medicine:', error);
          this.error = 'Failed to add medicine: ' + (error.message || error);
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      console.log('Form is invalid:', this.medicineForm.errors);
    }
  }

  updateMedicine(): void {
    console.log('Updating medicine, form valid:', this.medicineForm.valid);
    if (this.medicineForm.valid && this.editingMedicine?.medicineId) {
      const updatedMedicine = {
        ...this.medicineForm.value,
        id: this.editingMedicine.medicineId, // backend expects 'id'
      };
      console.log('Updated medicine data:', updatedMedicine);
      this.loading = true;

      this.medicineService
        .updateMedicine(this.editingMedicine.medicineId, updatedMedicine)
        .subscribe({
          next: (medicine) => {
            console.log('Medicine updated successfully:', medicine);
            // Update in both arrays
            const index = this.medicines.findIndex(
              (m) => m.medicineId === medicine.medicineId
            );
            if (index !== -1) {
              this.medicines[index] = medicine;
            }

            const filteredIndex = this.filteredMedicines.findIndex(
              (m) => m.medicineId === medicine.medicineId
            );
            if (filteredIndex !== -1) {
              this.filteredMedicines[filteredIndex] = medicine;
            }

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
          // Instantly remove the deleted row from the UI and force array reference change
          this.medicines = this.medicines.filter((m) => m.medicineId !== id);
          this.medicines = [...this.medicines];
          this.filteredMedicines = this.filteredMedicines.filter(
            (m) => m.medicineId !== id
          );
          this.filteredMedicines = [...this.filteredMedicines];
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
