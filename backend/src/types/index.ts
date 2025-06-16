// User related types
export enum UserRole {
  USER = 'user',
  AGENT = 'agent',
  ADMIN = 'admin'
}

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy'
}

// Message related types
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

// Chat room related types
export enum ChatRoomType {
  DIRECT = 'direct',
  SUPPORT = 'support',
  GROUP = 'group'
}

export enum ChatRoomStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PENDING = 'pending',
  TRANSFERRED = 'transferred'
}

// Priority types
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Socket event types
export type SocketEventType = 
  | 'join-room'
  | 'leave-room'
  | 'send-message'
  | 'message-delivered'
  | 'message-read'
  | 'typing'
  | 'agent-status-update'
  | 'get-online-users'
  | 'get-online-agents'
  | 'new-message'
  | 'user-joined-room'
  | 'user-left-room'
  | 'user-typing'
  | 'message-status-updated'
  | 'user-status-changed'
  | 'online-users'
  | 'online-agents'
  | 'chat-history'
  | 'error';

// API Response types
export type ApiSuccessResponse<T = any> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: any[];
};

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse; 