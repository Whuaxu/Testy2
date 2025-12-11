// chat-whatsapp.component.ts
import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ConversationService } from '../../services/conversation.service';
import { UserService } from '../../services/user.service';
import { WebSocketService } from '../../services/websocket.service';
import { User, Conversation, OnlineUser, Message } from '../../models';
import { ConversationList } from './conversation-list/conversation-list';
import { ChatWindow } from './chat-window/chat-window';
import { NewChat } from './new-chat/new-chat';


@Component({
  selector: 'app-chat',
  templateUrl: './chat-page.html',
  imports: [CommonModule, ConversationList, ChatWindow, NewChat],
  styleUrls: ['./chat-page.scss']
})
export default class ChatPage implements OnInit, OnDestroy {
  readonly conversations = signal<Conversation[]>([]);
  readonly selectedConversation = signal<Conversation | null>(null);
  readonly availableUsers = signal<User[]>([]);
  readonly showNewChatModal = signal(false);
  
  // Get currentUser from authService
  readonly currentUser = computed(() => this.authService.currentUser());
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private conversationService: ConversationService,
    private userService: UserService,
    readonly wsService: WebSocketService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Effect to handle WebSocket messages and update conversation list
    effect(() => {
      const message = this.wsService.newMessage();
      if (message) {
        this.handleNewMessage(message);
      }
    }, { allowSignalWrites: true });

    // Effect to handle message notifications from other conversations
    effect(() => {
      const notification = this.wsService.messageNotification();
      if (notification) {
        this.handleMessageNotification(notification);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadConversations();
    this.loadUsers();
    this.wsService.connect();
    this.handleRouteParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    const selected = this.selectedConversation();
    if (selected) {
      this.wsService.leaveConversation(selected.id);
    }
    this.wsService.disconnect();
  }

  private handleRouteParams(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const userId = params['userId'];
      const conversationId = params['conversationId'];

      if (userId) {
        // Navigate to chat with a specific user - create or get conversation
        this.openConversationWithUser(userId);
      } else if (conversationId) {
        // Navigate to a specific conversation
        this.openConversationById(conversationId);
      }
    });
  }

  private openConversationWithUser(userId: string): void {
    // createConversation now returns the full conversation with participants
    this.conversationService.createConversation(userId).subscribe({
      next: (conversation) => {
        // Add to conversations list if not exists
        const conversations = this.conversations();
        const existingIndex = conversations.findIndex(c => c.id === conversation.id);
        if (existingIndex === -1) {
          this.conversations.set([conversation, ...conversations]);
        } else {
          const updated = [...conversations];
          updated[existingIndex] = conversation;
          this.conversations.set(updated);
        }
        this.selectConversation(conversation);
      },
      error: (error) => {
        console.error('Error creating/getting conversation:', error);
      }
    });
  }

  private openConversationById(conversationId: string): void {
    this.conversationService.getConversation(conversationId).subscribe({
      next: (conversation) => {
        // Add to conversations list if not exists
        const conversations = this.conversations();
        const existingIndex = conversations.findIndex(c => c.id === conversation.id);
        if (existingIndex === -1) {
          this.conversations.set([conversation, ...conversations]);
        } else {
          const updated = [...conversations];
          updated[existingIndex] = conversation;
          this.conversations.set(updated);
        }
        this.selectConversation(conversation);
      },
      error: (error) => {
        console.error('Error loading conversation:', error);
        // Redirect to base chat if conversation not found
        this.router.navigate(['/chat']);
      }
    });
  }

  private selectConversation(conversation: Conversation): void {
    const selected = this.selectedConversation();
    if (selected) {
      this.wsService.leaveConversation(selected.id);
    }
    this.selectedConversation.set(conversation);
    this.wsService.joinConversation(conversation.id);
  }

  private handleNewMessage(message: Message): void {
    // Update conversation list with new message
    const conversations = this.conversations();
    const convIndex = conversations.findIndex(c => c.id === message.conversationId);
    if (convIndex > -1) {
      const updated = [...conversations];
      updated[convIndex] = {
        ...updated[convIndex],
        lastMessage: message,
        updatedAt: message.createdAt
      };
      // Move to top
      const [conv] = updated.splice(convIndex, 1);
      updated.unshift(conv);
      this.conversations.set(updated);
    }
  }

  private handleMessageNotification(data: {conversationId: string; message: Message}): void {
    // Update conversation in list if not currently viewing it
    const conversations = this.conversations();
    const convIndex = conversations.findIndex(c => c.id === data.conversationId);
    if (convIndex > -1) {
      const updated = [...conversations];
      updated[convIndex] = {
        ...updated[convIndex],
        lastMessage: data.message,
        updatedAt: data.message.createdAt
      };
      this.conversations.set(updated);
    }
  }

  private loadConversations(): void {
    this.conversationService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations.set(conversations);
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
      }
    });
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.availableUsers.set(users);
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  onConversationSelected(conversation: Conversation): void {
    // Navigate to the conversation URL
    this.router.navigate(['/chat/conversation', conversation.id]);
  }

  onMessageSent(content: string): void {
    const selected = this.selectedConversation();
    if (!selected) return;
    
    this.conversationService.sendMessage(selected.id, content).subscribe({
      next: (message) => {
        // Message will be received via WebSocket
      },
      error: (error) => {
        console.error('Error sending message:', error);
      }
    });
  }

  startNewChat(user: User): void {
    this.showNewChatModal.set(false);
    // Navigate to user chat URL which will create/get the conversation
    this.router.navigate(['/chat/user', user.id]);
  }

  getUserInitial(): string {
    const user = this.currentUser();
    return user?.username?.charAt(0).toUpperCase() || '?';
  }

  logout(): void {
    this.wsService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}