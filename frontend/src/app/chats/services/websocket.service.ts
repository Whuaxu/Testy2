import { Injectable, OnDestroy, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Message, OnlineUser } from '../models';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  
  readonly onlineUsers = signal<OnlineUser[]>([]);
  readonly newMessage = signal<Message | null>(null);
  readonly messageNotification = signal<{conversationId: string; message: Message} | null>(null);
  readonly typing = signal<{userId: string; username: string; conversationId: string; isTyping: boolean} | null>(null);
  readonly connectionStatus = signal<boolean>(false);

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for WebSocket connection');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatus.set(true);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connectionStatus.set(false);
    });

    this.socket.on('online-users', (users: OnlineUser[]) => {
      this.onlineUsers.set(users);
    });

    this.socket.on('user-online', (user: OnlineUser) => {
      const current = this.onlineUsers();
      if (!current.find(u => u.userId === user.userId)) {
        this.onlineUsers.set([...current, user]);
      }
    });

    this.socket.on('user-offline', (user: OnlineUser) => {
      const current = this.onlineUsers();
      this.onlineUsers.set(current.filter(u => u.userId !== user.userId));
    });

    this.socket.on('new-message', (message: Message) => {
      this.newMessage.set(message);
    });

    this.socket.on('message-notification', (data: {conversationId: string; message: Message}) => {
      this.messageNotification.set(data);
    });

    this.socket.on('user-typing', (data: {userId: string; username: string; conversationId: string; isTyping: boolean}) => {
      this.typing.set(data);
    });

    this.socket.on('error', (error: {message: string}) => {
      console.error('WebSocket error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus.set(false);
    }
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit('join-conversation', conversationId);
    console.log(`📥 Joined conversation: ${conversationId}`);
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave-conversation', conversationId);
    console.log(`📤 Left conversation: ${conversationId}`);
  }

  sendMessage(conversationId: string, content: string): void {
    if (!this.socket) {
      console.error('❌ WebSocket no está conectado');
      return;
    }

    this.socket?.emit('send-message', { conversationId, content });
    console.log(`📤 Mensaje enviado: ${content} a la conversación ${conversationId}`);
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  markMessageAsRead(messageId: string, conversationId: string): void {
    this.socket?.emit('message-read', { messageId, conversationId });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
