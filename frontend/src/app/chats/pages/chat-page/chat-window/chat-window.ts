import { Component, input, output, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation, Message, User } from '../../../models';
import { ConversationService } from '../../../services/conversation.service';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-chat-window',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss'
})
  
export class ChatWindow implements OnInit, OnDestroy, AfterViewChecked {
  conversation = input.required<Conversation>();
  currentUser = input<User | null>(null);
  
  // Signal output
  messageSent = output<string>();

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // Signals for reactive state
  readonly messages = signal<Message[]>([]);
  readonly newMessage = signal('');
  readonly typingUser = signal<string | null>(null);
  private previousConversationId = signal<string | null>(null);
  
  // Computed signals
  readonly isOnline = computed(() => {
    const otherParticipantId = this.conversation().participantIds.find(
      id => id !== this.currentUser()?.id
    );
    return this.wsService.onlineUsers().some(u => u.userId === otherParticipantId);
  });
  
  readonly otherParticipantName = computed(() => {
    const conv = this.conversation();
    if (conv.name) return conv.name;
    
    const otherParticipant = conv.participants?.find(
      p => p.id !== this.currentUser()?.id
    );
    return otherParticipant?.username || 'Usuario';
  });
  
  private shouldScrollToBottom = true;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private conversationService: ConversationService,
    private wsService: WebSocketService
  ) {
    // Effect to reload messages when conversation changes
    effect(() => {
      const conv = this.conversation();
      if (conv && conv.id !== this.previousConversationId()) {
        this.previousConversationId.set(conv.id);
        this.loadMessages();
      }
    }, { allowSignalWrites: true });

    // Effect to handle new messages - only for current conversation
    // Read conversation ID once outside the conditional to avoid dependency issues
    effect(() => {
      const message = this.wsService.newMessage();
      if (!message) return;
      
      const conv = this.conversation();
      if (message.conversationId === conv.id) {
        // Check if message already exists to prevent duplicates
        const currentMessages = this.messages();
        const messageExists = currentMessages.some(m => 
          m.id === message.id || 
          (m.content === message.content && 
           m.senderId === message.senderId && 
           Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 1000)
        );
        
        if (!messageExists) {
          this.messages.update(msgs => [...msgs, message]);
          this.shouldScrollToBottom = true;
        }
      }
    }, { allowSignalWrites: true });

    // Effect to handle typing events - only for current conversation
    effect(() => {
      const typingData = this.wsService.typing();
      if (!typingData) return;
      
      const conv = this.conversation();
      const currentUserId = this.currentUser()?.id;
      
      if (typingData.conversationId === conv.id && 
          typingData.userId !== currentUserId) {
        this.typingUser.set(typingData.isTyping ? typingData.username : null);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Messages are loaded by the effect when conversation changes
  }

  ngOnDestroy(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  private loadMessages(): void {
    this.conversationService.getMessages(this.conversation().id).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = 
        this.messagesContainer.nativeElement.scrollHeight;
      this.shouldScrollToBottom = false;
    } catch (err) {}
  }

  formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date; 
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

  onTyping(): void {
    this.wsService.sendTyping(this.conversation().id, true);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.typingTimeout = setTimeout(() => {
      this.wsService.sendTyping(this.conversation().id, false);
    }, 2000);
  }

  sendMessage(): void {
    const content = this.newMessage().trim();
    if (!content) return;

    // Envía el mensaje al WebSocket
    // No añadimos el mensaje localmente porque el servidor lo devolverá via WebSocket
    this.wsService.sendMessage(this.conversation().id, content);

    // Limpia el input
    this.newMessage.set('');
    
    // Enviar señal de que dejamos de escribir
    this.wsService.sendTyping(this.conversation().id, false);
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }
}
