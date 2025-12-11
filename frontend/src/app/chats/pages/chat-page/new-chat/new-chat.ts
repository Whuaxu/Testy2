import { Component, input, output, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of } from 'rxjs';
import { User } from '../../../models';
import { UserService } from '../../../services/user.service';


@Component({
  selector: 'app-new-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './new-chat.html',
  styleUrl: './new-chat.scss'
})
export class NewChat { 
  users = input<User[]>([]);
  currentUserId = input<string | undefined>();
  
  // Signal outputs
  close = output<void>();
  userSelected = output<User>();

  // Signals for reactive state
  readonly searchQuery = signal('');
  readonly filteredUsers = signal<User[]>([]);
  readonly isSearching = signal(false);
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length === 0) {
          this.isSearching.set(false);
          return of([]);
        }
        this.isSearching.set(true);
        return this.userService.searchUsers(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.filteredUsers.set(users.filter(u => u.id !== this.currentUserId()));
      this.isSearching.set(false);
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  selectUser(user: User): void {
    this.userSelected.emit(user);
  }
}
