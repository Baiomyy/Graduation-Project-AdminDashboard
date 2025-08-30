import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./components/dashboard-home/dashboard-home').then(m => m.DashboardHome) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./components/user-profile/user-profile').then(m => m.UserProfile) },
  { path: 'warehouses', canActivate: [authGuard], loadComponent: () => import('./components/warehouses/warehouses.component').then(m => m.Warehouses) },
  { path: 'missing-items', canActivate: [authGuard], loadComponent: () => import('./components/missing-items/missing-items.component').then(m => m.MissingItemsComponent) },
  { path: 'representative', canActivate: [authGuard], loadComponent: () => import('./components/representative/representative').then(m => m.RepresentativeComponent) },

  { path: 'pharmacies', canActivate: [authGuard], loadComponent: () => import('./components/pharmacies/pharmacies.component').then(m => m.PharmaciesComponent) },
  { path: 'medicines', canActivate: [authGuard], loadComponent: () => import('./components/medicines/medicines.component').then(m => m.Medicines) },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
  ,{ path: '**', redirectTo: 'login' }
];
