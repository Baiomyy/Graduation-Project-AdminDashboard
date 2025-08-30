import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Sidebar } from './components/sidebar/sidebar';


@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Navbar, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'ready-dashboard';
  constructor(private router: Router) {}

  get isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }
}
