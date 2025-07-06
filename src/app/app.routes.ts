import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'dashboard', loadComponent: () => import('./components/dashboard-home/dashboard-home').then(m => m.DashboardHome) },
  { path: 'profile', loadComponent: () => import('./components/user-profile/user-profile').then(m => m.UserProfile) },
  { path: 'warehouses', loadComponent: () => import('./components/warehouses/warehouses.component').then(m => m.Warehouses) },
  { path: 'representative', loadComponent: () => import('./components/representative/representative').then(m => m.RepresentativeComponent) },

  { path: 'pharmacies', loadComponent: () => import('./components/pharmacies/pharmacies.component').then(m => m.PharmaciesComponent) },
  { path: 'medicines', loadComponent: () => import('./components/medicines/medicines.component').then(m => m.Medicines) },
  // Add more routes for other major sections as needed
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];
