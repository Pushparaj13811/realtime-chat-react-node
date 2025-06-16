import type { UserRole, UserStatus, MessageType, MessageStatus, ChatRoomType, ChatRoomStatus } from '../types/index.js';
import type { IUser, IMessage, IChatRoom } from './index.js';

// Cache Service Interfaces
export interface ICacheService {
  cacheMessage(message: IMessage): Promise<void>;
  getCachedMessages(chatRoomId: string, limit?: number, offset?: number): Promise<CachedMessage[]>;
  getRecentMessages(chatRoomId: string, count?: number): Promise<CachedMessage[]>;
  cacheChatRoom(chatRoom: IChatRoom): Promise<void>;
  getCachedChatRoom(chatRoomId: string): Promise<CachedChatRoom | null>;
  setUserOnline(userId: string, socketId: string): Promise<void>;
  setUserOffline(userId: string): Promise<void>;
  getOnlineUsers(): Promise<string[]>;
  getUserSocketId(userId: string): Promise<string | null>;
  setAgentStatus(agentId: string, status: string, maxChats?: number): Promise<void>;
  getAgentStatus(agentId: string): Promise<AgentStatus | null>;
  clearChatHistory(chatRoomId: string): Promise<void>;
  clearUserCache(userId: string): Promise<void>;
}

export interface CachedMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType: string;
  status: string;
  createdAt: string;
  metadata?: any;
}

export interface CachedChatRoom {
  id: string;
  participants: string[];
  assignedAgent?: string;
  lastActivity: string;
  status: string;
}

export interface AgentStatus {
  status: string;
  maxChats: number;
  currentChats: number;
  lastUpdated: string;
}

// Auth Service Interfaces
export interface IAuthService {
  register(userData: RegisterData): Promise<RegisterResult>;
  login(email: string, password: string): Promise<LoginResult>;
  validateSession(sessionId: string): Promise<AuthSession | null>;
  logout(sessionId: string): Promise<boolean>;
  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean;
  canAccessResource(userRole: UserRole, resourceType: string): boolean;
  getUserById(userId: string): Promise<IUser | null>;
  updateUserStatus(userId: string, status: UserStatus, socketId?: string): Promise<boolean>;
  getActiveSessions(): AuthSession[];
  getOnlineAgents(): Promise<IUser[]>;
  getAllAgents(): Promise<IUser[]>;
  cleanExpiredSessions(): void;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
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

export interface LoginResult {
  success: boolean;
  user?: AuthSession;
  message: string;
}

export interface RegisterResult {
  success: boolean;
  user?: Partial<IUser>;
  message: string;
}

// Message Service Interfaces
export interface IMessageService {
  createMessage(messageData: CreateMessageData): Promise<IMessage>;
  getMessages(query: GetMessagesQuery): Promise<IMessage[]>;
  getMessage(messageId: string): Promise<IMessage | null>;
  markAsDelivered(messageId: string, userId: string): Promise<boolean>;
  markAsRead(messageId: string, userId: string): Promise<boolean>;
  deleteMessage(messageId: string, userId: string): Promise<boolean>;
  editMessage(messageId: string, content: string, userId: string): Promise<IMessage | null>;
  getUnreadCount(userId: string): Promise<number>;
  searchMessages(query: string, chatRoomId?: string): Promise<IMessage[]>;
}

export interface CreateMessageData {
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType?: MessageType;
  replyTo?: string;
  metadata?: any;
}

export interface GetMessagesQuery {
  chatRoomId: string;
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
  messageType?: MessageType;
}

// Chat Room Service Interfaces
export interface IChatRoomService {
  createChatRoom(roomData: CreateChatRoomData): Promise<IChatRoom>;
  getChatRoomById(chatRoomId: string): Promise<IChatRoom | null>;
  getUserChatRooms(userId: string): Promise<IChatRoom[]>;
  addParticipant(chatRoomId: string, userId: string): Promise<boolean>;
  removeParticipant(chatRoomId: string, userId: string): Promise<boolean>;
  assignAgent(chatRoomId: string, agentId: string): Promise<boolean>;
  transferChat(chatRoomId: string, fromAgentId: string, toAgentId: string, reason?: string): Promise<boolean>;
  updateChatRoomStatus(chatRoomId: string, status: ChatRoomStatus): Promise<boolean>;
  getAvailableAgent(): Promise<IUser | null>;
  getAgentChatRooms(agentId: string): Promise<IChatRoom[]>;
  updateLastActivity(chatRoomId: string): Promise<boolean>;
  closeChatRoom(chatRoomId: string, reason?: string): Promise<boolean>;
}

export interface CreateChatRoomData {
  name?: string;
  type: ChatRoomType;
  participants: string[];
  createdBy: string;
  assignedAgent?: string;
  metadata?: {
    subject?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
}

// Socket Service Interfaces
export interface ISocketService {
  initialize(server: any): void;
  getIO(): any;
  sendToUser(userId: string, event: string, data: any): Promise<void>;
  sendToRoom(chatRoomId: string, event: string, data: any): Promise<void>;
  getConnectedUsersCount(): number;
  getRoomUsers(chatRoomId: string): Promise<SocketUser[]>;
}

export interface SocketUser {
  userId: string;
  username: string;
  role: string;
  socketId: string;
}

export interface ChatMessage {
  chatRoomId: string;
  content: string;
  messageType?: string;
  replyTo?: string;
  metadata?: any;
}

export interface JoinRoomData {
  chatRoomId: string;
}

export interface TypingData {
  chatRoomId: string;
  isTyping: boolean;
}

// Database Config Interfaces
export interface IDatabaseConfig {
  connectMongoDB(): Promise<void>;
  connectRedis(): Promise<void>;
  disconnect(): Promise<void>;
  getRedisClient(): any;
  getMongoConnection(): any;
} 