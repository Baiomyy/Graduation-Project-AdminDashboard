import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  activeRoute: string = '/dashboard';

  constructor(private router: Router) {
    // Subscribe to router events to track current route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.activeRoute = event.url;
      });
  }

  isActive(route: string): boolean {
    return this.activeRoute === route;
  }

  setActive(route: string): void {
    this.activeRoute = route;
  }
}
