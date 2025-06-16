import mongoose, { Document } from 'mongoose';
import type { 
  UserRole, 
  UserStatus, 
  MessageType, 
  MessageStatus, 
  ChatRoomType, 
  ChatRoomStatus,
  Priority 
} from '../types/index.js';

// Database Interfaces
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  isOnline: boolean;
  lastSeen: Date;
  socketId?: string;
  assignedChats: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  chatRoomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId;
  content: string;
  messageType: MessageType;
  status: MessageStatus;
  readBy: Array<{
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }>;
  deliveredTo: Array<{
    userId: mongoose.Types.ObjectId;
    deliveredAt: Date;
  }>;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    imageUrl?: string;
  };
  isEdited: boolean;
  editedAt?: Date;
  replyTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatRoom extends Document {
  name?: string;
  type: ChatRoomType;
  status: ChatRoomStatus;
  participants: mongoose.Types.ObjectId[];
  assignedAgent?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  lastActivity: Date;
  isActive: boolean;
  metadata?: {
    subject?: string;
    priority?: Priority;
    tags?: string[];
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  transferHistory: Array<{
    fromAgent: mongoose.Types.ObjectId;
    toAgent: mongoose.Types.ObjectId;
    transferredAt: Date;
    reason?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Service Interfaces
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
  message?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: IUser;
  message?: string;
}

export interface CreateMessageData {
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType?: MessageType;
  receiverId?: string;
  replyTo?: string;
  metadata?: any;
}

export interface MessageQuery {
  chatRoomId: string;
  page?: number;
  limit?: number;
  before?: Date;
  after?: Date;
}

export interface CreateChatRoomData {
  type: ChatRoomType;
  createdBy: string;
  participants: string[];
  name?: string;
  assignedAgent?: string;
  metadata?: any;
}

export interface AgentAssignment {
  chatRoomId: string;
  agentId: string;
  reason?: string;
}

// Cache Interfaces
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

// Socket Interfaces
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

// Request/Response Interfaces
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateChatRoomRequest {
  type: ChatRoomType;
  participants: string[];
  name?: string;
  assignedAgent?: string;
  metadata?: any;
}

export interface AssignAgentRequest {
  chatRoomId: string;
  agentId: string;
  reason?: string;
}

export interface TransferChatRequest {
  chatRoomId: string;
  toAgentId: string;
  reason?: string;
}

// Re-export service interfaces (only the ones not already defined above)
export type {
  ICacheService,
  AgentStatus,
  IAuthService,
  IMessageService,
  GetMessagesQuery,
  IChatRoomService,
  ISocketService,
  IDatabaseConfig
} from './services.interfaces.js'; 