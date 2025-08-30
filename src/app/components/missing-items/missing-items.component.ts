import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MissingItemsService, MissingItem, MissingItemDetail } from '../../services/missing-items.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-missing-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './missing-items.component.html',
  styleUrls: ['./missing-items.component.scss']
})
export class MissingItemsComponent implements OnInit, OnDestroy {
  // Data properties
  missingItems: MissingItem[] = [];
  allMissingItems: MissingItem[] = []; // Store all items for filtering
  
  // State properties
  loading: boolean = false;
  error: string | null = null;
  
  // Search and filter properties
  searchTerm: string = '';
  areaFilter: string = '';
  
  // Details modal properties
  showDetailsModal: boolean = false;
  selectedPharmacy: MissingItem | null = null;
  missingItemDetails: MissingItemDetail[] = [];
  detailsError: string | null = null;
  detailsLoading: boolean = false;
  
  private subscription: Subscription = new Subscription();

  constructor(
    private missingItemsService: MissingItemsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMissingItems();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadMissingItems(): void {
    this.loading = true;
    this.error = null;

    this.subscription.add(
      this.missingItemsService.getPharmaciesMissingItems()
        .subscribe({
          next: (response) => {
            this.allMissingItems = response.items;
            this.applyFilters();
            this.loading = false;
          },
          error: (err) => {
            console.error('Error loading missing items:', err);
            this.error = 'Failed to load missing items. Please try again later.';
            this.loading = false;
          }
        })
    );
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onAreaFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.areaFilter = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    let filteredItems = [...this.allMissingItems];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filteredItems = filteredItems.filter(item => 
        item.pharmacyName.toLowerCase().includes(searchLower) ||
        item.representativeName.toLowerCase().includes(searchLower)
      );
    }

    // Apply area filter
    if (this.areaFilter) {
      filteredItems = filteredItems.filter(item => 
        item.pharmacyArea === this.areaFilter
      );
    }

    this.missingItems = filteredItems;
  }

  getUniqueAreas(): string[] {
    const areas = [...new Set(this.allMissingItems.map(item => item.pharmacyArea))];
    return areas.sort();
  }

  retry(): void {
    this.loadMissingItems();
  }

  onPharmacyClick(pharmacy: MissingItem): void {
    this.selectedPharmacy = pharmacy;
    this.showDetailsModal = true;
    this.detailsError = null;
    this.missingItemDetails = [];
    
    // Load data immediately without loading spinner
    this.loadMissingItemDetails(pharmacy.pharmacyId);
  }

  loadMissingItemDetails(pharmacyId: number): void {
    this.detailsError = null;
    this.missingItemDetails = []; // Clear previous data
    this.detailsLoading = true;

    this.subscription.add(
      this.missingItemsService.getMissingItemsById(pharmacyId)
        .subscribe({
          next: (details) => {
            this.missingItemDetails = details;
            this.detailsLoading = false;
            this.cdr.detectChanges(); // Force change detection
          },
          error: (err) => {
            console.error('Error loading missing item details:', err);
            this.detailsError = 'Failed to load missing item details. Please try again later.';
            this.detailsLoading = false;
            this.cdr.detectChanges(); // Force change detection
          }
        })
    );
  }

  deleteMissingItem(medicineId: number): void {
    if (confirm('Are you sure you want to delete this missing item?')) {
      if (this.selectedPharmacy) {
        this.missingItemsService.deleteMissingItem(this.selectedPharmacy.pharmacyId, medicineId).subscribe({
          next: () => {
            // Remove the item from the local array after successful API call
            this.missingItemDetails = this.missingItemDetails.filter(item => item.medicineId !== medicineId);
            this.cdr.detectChanges();
            
            // If this was the last item, refresh the main list to remove this pharmacy
            if (this.missingItemDetails.length === 0) {
              this.loadMissingItems();
            }
          },
          error: (err) => {
            console.error('Error deleting missing item:', err);
            alert('Failed to delete missing item. Please try again.');
          }
        });
      }
    }
  }

  clearAllMissingItems(): void {
    if (confirm(`Are you sure you want to delete all ${this.missingItemDetails.length} missing items?`)) {
      if (this.selectedPharmacy) {
        this.missingItemsService.deleteAllMissingItems(this.selectedPharmacy.pharmacyId).subscribe({
          next: () => {
            // Clear the local array after successful API call
            this.missingItemDetails = [];
            this.cdr.detectChanges();
            
            // Refresh the main missing items list to remove this pharmacy
            this.loadMissingItems();
          },
          error: (err) => {
            console.error('Error deleting all missing items:', err);
            alert('Failed to delete all missing items. Please try again.');
          }
        });
      }
    }
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedPharmacy = null;
    this.missingItemDetails = [];
    this.detailsError = null;
  }
} 