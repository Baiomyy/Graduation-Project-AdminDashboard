# Warehouse Management Features

This document outlines the comprehensive warehouse management features implemented in the Angular admin dashboard.

## Features Overview

### 1. Show All Warehouses

- **Display**: Table view with all warehouse information
- **Columns**: Name, Address, Governorate, Area, Contact Info, Status, Actions
- **Pagination**: Supports pagination for large datasets
- **Loading States**: Shows loading spinners during data fetch

### 2. Add New Warehouse

- **Form**: Comprehensive form with validation
- **Fields**: Name, Address, Phone Number, Email, Governorate, Area
- **Validation**: Required fields with error messages
- **API Integration**: Connects to backend API for creation

### 3. Governorate and Area Filters

- **Dropdown Filters**: Filter warehouses by governorate and area
- **Dynamic Areas**: Areas update based on selected governorate
- **Real-time Filtering**: Results update immediately on filter change

### 4. CRUD Operations

#### Create

- Add new warehouse with all required information
- Form validation and error handling
- Success/error feedback to user

#### Read

- View warehouse details in modal
- Display comprehensive information including statistics
- Show total medicines and orders count

#### Update

- Edit existing warehouse information
- Pre-populated form with current data
- Validation and error handling

#### Delete

- Delete warehouse with confirmation dialog
- Safety checks before deletion
- Success/error feedback

### 5. Medicines Management

#### View Medicines

- Display all medicines in a specific warehouse
- Table view with medicine details
- Pagination support for large inventories

#### Add Medicine

- Form to add new medicine to warehouse
- Fields: Name, Description, Quantity, Unit Price, Expiry Date, Supplier, Category
- Validation for all required fields

#### Edit Medicine

- Update existing medicine information
- Pre-populated form with current data
- Real-time validation

#### Delete Medicine

- Remove medicine from warehouse
- Confirmation dialog for safety
- Immediate UI update

#### Excel Upload

- Upload Excel files (.xlsx) with medicines data
- Bulk import functionality
- Progress indication during upload
- Success/error feedback with import count

### 6. Orders Management

#### View Orders

- Display all orders related to a specific warehouse
- Order details including customer information
- Order status tracking
- Pagination support

#### Order Details

- View individual order items
- Customer information
- Order dates and delivery information
- Total amount calculation

## API Endpoints (Dummy URLs)

The following API endpoints are used in the implementation:

### Warehouse Management

- `GET /api/Warehouse/GetAll` - Get all warehouses with pagination and filters
- `GET /api/Warehouse/GetById/{id}` - Get warehouse details
- `POST /api/Warehouse/Create` - Create new warehouse
- `PUT /api/Warehouse/Update/{id}` - Update warehouse
- `DELETE /api/Warehouse/Delete/{id}` - Delete warehouse

### Medicines Management

- `GET /api/Warehouse/Medicines/{warehouseId}` - Get warehouse medicines
- `POST /api/Warehouse/Medicines/{warehouseId}` - Add medicine to warehouse
- `PUT /api/Warehouse/Medicines/{warehouseId}/{medicineId}` - Update warehouse medicine
- `DELETE /api/Warehouse/Medicines/{warehouseId}/{medicineId}` - Delete warehouse medicine
- `POST /api/Warehouse/UploadMedicines/{warehouseId}` - Upload Excel file with medicines

### Orders Management

- `GET /api/Warehouse/Orders/{warehouseId}` - Get warehouse orders

### Location Data

- `GET /api/Locations/Governorates` - Get governorates and areas

## Component Structure

### Files

- `warehouses.component.ts` - Main component logic
- `warehouses.component.html` - Template with all UI elements
- `warehouses.scss` - Styling for the component
- `warehouse.service.ts` - Service for API communication

### Key Features

- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Proper loading indicators throughout
- **Error Handling**: Comprehensive error handling and user feedback
- **Form Validation**: Real-time validation with error messages
- **Modal Dialogs**: Clean modal interfaces for details and forms
- **Pagination**: Efficient pagination for large datasets
- **Excel Integration**: File upload for bulk data import

## Usage Instructions

1. **View Warehouses**: Navigate to the warehouses section to see all warehouses
2. **Filter**: Use governorate and area dropdowns to filter results
3. **Add Warehouse**: Click "Add New Warehouse" button and fill the form
4. **Edit Warehouse**: Click the edit button on any warehouse row
5. **Delete Warehouse**: Click the delete button (with confirmation)
6. **View Details**: Click on any warehouse row to see detailed information
7. **Manage Medicines**: Click the medicines button to view/add/edit medicines
8. **Upload Excel**: Use the Excel upload feature to bulk import medicines
9. **View Orders**: Click the orders button to see warehouse orders

## Technical Implementation

- **Angular 17**: Latest Angular version with standalone components
- **TypeScript**: Strong typing for all interfaces and services
- **Reactive Forms**: Form handling with validation
- **RxJS**: Observable patterns for API communication
- **Bootstrap**: UI framework for responsive design
- **SCSS**: Advanced styling with variables and mixins

## Mock Data

The implementation includes comprehensive mock data for testing:

- 5 sample warehouses with different locations and statuses
- 5 sample medicines with various categories and suppliers
- 3 sample orders with customer information and items
- 5 governorates with multiple areas each

This ensures the application works immediately without requiring backend implementation.
