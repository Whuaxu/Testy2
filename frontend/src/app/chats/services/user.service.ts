import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${id}`);
  }

  searchUsers(query: string): Observable<User[]> {
    if (!query || query.trim().length === 0) {
      return of([]);
    }
    return this.http.get<User[]>(`${environment.apiUrl}/users/search`, {
      params: { q: query.trim() }
    }).pipe(
      catchError(() => of([]))
    );
  }
}
