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
  READ = 'read',
  FAILED = 'failed'
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

// Department types
export enum Department {
  TECHNICAL_SUPPORT = 'technical_support',
  BILLING = 'billing',
  SALES = 'sales',
  GENERAL_SUPPORT = 'general_support',
  ACCOUNT_MANAGEMENT = 'account_management',
  UNKNOWN = 'unknown',
  OTHER = 'other'
}

// Problem types
export enum ProblemType {
  // Technical Support
  TECHNICAL_ISSUE = 'technical_issue',
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  INSTALLATION_HELP = 'installation_help',
  
  // Billing
  PAYMENT_ISSUE = 'payment_issue',
  REFUND_REQUEST = 'refund_request',
  BILLING_INQUIRY = 'billing_inquiry',
  SUBSCRIPTION_CHANGE = 'subscription_change',
  
  // Sales
  PRODUCT_INQUIRY = 'product_inquiry',
  QUOTE_REQUEST = 'quote_request',
  DEMO_REQUEST = 'demo_request',
  PRICING_QUESTION = 'pricing_question',
  
  // General
  GENERAL_QUESTION = 'general_question',
  COMPLAINT = 'complaint',
  FEEDBACK = 'feedback',
  
  // Account Management
  ACCOUNT_ACCESS = 'account_access',
  PROFILE_UPDATE = 'profile_update',
  DATA_REQUEST = 'data_request',
  
  // Other
  OTHER = 'other'
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
  | 'set-active-chat'
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

// Express Request extension for authentication
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
        email: string;
      };
    }
  }
} 