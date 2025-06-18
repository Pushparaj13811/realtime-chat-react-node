// User and Auth Types
export const UserRole = {
  USER: 'user',
  AGENT: 'agent',
  ADMIN: 'admin'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away'
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

// Department Types
export const Department = {
  TECHNICAL_SUPPORT: 'technical_support',
  BILLING: 'billing',
  SALES: 'sales',
  GENERAL_SUPPORT: 'general_support',
  ACCOUNT_MANAGEMENT: 'account_management',
  UNKNOWN: 'unknown',
  OTHER: 'other'
} as const;

export type Department = typeof Department[keyof typeof Department];

export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isOnline: boolean;
  lastSeen: Date;
  socketId?: string;
  specialization?: string;
  department?: Department;
}

export interface AuthSession {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
}

// Message Types
export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system'
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

export const MessageStatus = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
} as const;

export type MessageStatus = typeof MessageStatus[keyof typeof MessageStatus];

export interface Message {
  _id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  status: MessageStatus;
  replyTo?: string;
  metadata?: Record<string, unknown>;
  deliveredTo: Array<{
    userId: string;
    deliveredAt: Date;
  }>;
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Chat Room Types
export const ChatRoomType = {
  DIRECT: 'direct',
  SUPPORT: 'support',
  GROUP: 'group'
} as const;

export const ChatRoomStatus = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  PENDING: 'pending',
  TRANSFERRED: 'transferred'
} as const;

export type ChatRoomType = typeof ChatRoomType[keyof typeof ChatRoomType];
export type ChatRoomStatus = typeof ChatRoomStatus[keyof typeof ChatRoomStatus];

export interface ChatRoom {
  _id: string;
  name?: string;
  type: ChatRoomType;
  status: ChatRoomStatus;
  participants: User[];
  assignedAgent?: User;
  createdBy: string;
  lastMessage?: Message;
  lastActivity: Date;
  isActive: boolean;
      metadata?: {
      tags?: string[];
      subject?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      customerInfo?: {
        name?: string;
        email?: string;
        phone?: string;
      };
    };
  transferHistory?: Array<{
    fromAgent?: string;
    toAgent?: string;
    transferredAt: Date;
    reason?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Socket Types
export interface SocketUser {
  userId: string;
  username: string;
  role: string;
  socketId: string;
}

export interface ChatMessage {
  chatRoomId: string;
  content: string;
  messageType?: MessageType;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface JoinRoomData {
  chatRoomId: string;
}

export interface TypingData {
  chatRoomId: string;
  isTyping: boolean;
}

export interface UserTyping {
  userId: string;
  username: string;
  chatRoomId: string;
  isTyping: boolean;
}

// API Response Types
export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  message: string;
  statusCode: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  department?: Department;
  specialization?: string;
}

export interface CreateChatRoomRequest {
  name?: string;
  type: ChatRoomType;
  participants?: string[];
  metadata?: {
    tags?: string[];
    subject?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
}

// Export Types
export interface ExportOptions {
  format: 'json' | 'csv';
  chatRoomId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Chat State Types
export interface ChatState {
  chatRooms: ChatRoom[];
  currentChatRoom: ChatRoom | null;
  messages: { [chatRoomId: string]: Message[] };
  onlineUsers: SocketUser[];
  onlineAgents: User[];
  typingUsers: { [chatRoomId: string]: UserTyping[] };
  unreadCounts: { [chatRoomId: string]: number };
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

// UI State Types
export interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  currentView: 'chat' | 'settings' | 'profile';
}
