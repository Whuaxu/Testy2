import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Conversation, Message } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  constructor(private http: HttpClient) {}

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${environment.apiUrl}/conversations`);
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${environment.apiUrl}/conversations/${id}`);
  }

  createConversation(participantId: string, name?: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${environment.apiUrl}/conversations`, {
      participantId,
      name
    });
  }

  getMessages(conversationId: string, limit = 50, skip = 0): Observable<Message[]> {
    return this.http.get<Message[]>(
      `${environment.apiUrl}/conversations/${conversationId}/messages?limit=${limit}&skip=${skip}`
    );
  }

  sendMessage(conversationId: string, content: string): Observable<Message> {
    return this.http.post<Message>(`${environment.apiUrl}/messages`, {
      conversationId,
      content
    });
  }
}
