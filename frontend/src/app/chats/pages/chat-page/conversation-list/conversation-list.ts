import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Conversation, OnlineUser } from '../../../models';

@Component({
  selector: 'app-conversation-list',
  imports: [CommonModule],
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.scss'
})
export class ConversationList {
  conversations = input<Conversation[]>([]);
  selectedConversationId = input<string | undefined>();
  currentUserId = input<string | undefined>();
  onlineUsers = input<OnlineUser[]>([]);
  
  // Signal output
  conversationSelected = output<Conversation>();

  selectConversation(conversation: Conversation): void {
    this.conversationSelected.emit(conversation);
  }

  getOtherParticipantName(conversation: Conversation): string {
    if (conversation.name) return conversation.name;
    
    const otherParticipant = conversation.participants?.find(
      p => p.id !== this.currentUserId()
    );
    return otherParticipant?.username || 'Usuario';
  }

  isParticipantOnline(conversation: Conversation): boolean {
    const otherParticipantId = conversation.participantIds.find(
      id => id !== this.currentUserId()
    );
    return this.onlineUsers().some(u => u.userId === otherParticipantId);
  }

  formatTime(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return d.toLocaleDateString('es', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    }
  }
}
