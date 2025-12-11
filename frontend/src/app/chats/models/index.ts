export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: Date;
  read: boolean;
  sender?: User;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageId?: string;
  participants?: User[];
  lastMessage?: Message;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OnlineUser {
  userId: string;
  username: string;
}
