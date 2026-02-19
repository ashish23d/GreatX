export interface User {
  id: number;
  username: string;
}

export interface Chat {
  id: string;
  userId: number;
  title: string;
  createdAt: string;
}

export interface Message {
  id?: number;
  chatId: string;
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image';
  createdAt?: string;
}
