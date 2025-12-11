import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, LoginCredentials, RegisterData, AuthResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('current_user');
    
    if (token && user) {
      this.token.set(token);
      this.currentUser.set(JSON.parse(user));
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/users/login`, credentials).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  register(data: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/users/register`, data).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('current_user', JSON.stringify(response.user));
    this.token.set(response.token);
    this.currentUser.set(response.user);
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.token.set(null);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem('current_user', JSON.stringify(user));
      })
    );
  }
}