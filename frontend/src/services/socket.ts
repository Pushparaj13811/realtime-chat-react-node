import { io, type Socket } from 'socket.io-client';
import type { 
  Message, 
  ChatMessage, 
  JoinRoomData, 
  TypingData, 
  UserTyping,
  SocketUser,
  UserStatus,
  User,
  ChatRoom
} from '../types';

interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;
  
  // Message events
  'new-message': (data: { message: Message; sender: { id: string; username: string; role: string } }) => void;
  'message-status-updated': (data: { messageId: string; status: string; userId: string }) => void;
  'chat-history': (data: { chatRoomId: string; messages: Message[] }) => void;
  
  // Room events
  'user-joined-room': (data: { userId: string; username: string; chatRoomId: string }) => void;
  'user-left-room': (data: { userId: string; username: string; chatRoomId: string }) => void;
  
  // Typing events
  'user-typing': (data: UserTyping) => void;
  
  // Status events
  'user-status-changed': (data: { userId: string; status: UserStatus; timestamp: Date }) => void;
  'online-users': (users: SocketUser[]) => void;
  'online-agents': (agents: User[]) => void;
  
  // Agent assignment events
  'agent-removed': (data: { chatRoomId: string; removedAgentId: string; newAgent: User | null; reason: string; timestamp: Date }) => void;
  'agent-assignment-removed': (data: { chatRoomId: string; reason: string }) => void;
  'agent-assignment-received': (data: { chatRoom: object; reason: string }) => void;
  'chat-room-updated': (data: { chatRoom: ChatRoom; action: string; reason?: string }) => void;
  
  // Chat activity events
  'set-active-chat': (data: { chatRoomId: string | null }) => void;
  
  // Error events
  error: (data: { message: string }) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Array<(...args: unknown[]) => void>> = new Map();
  private currentSessionId: string | null = null;

  connect(sessionId: string): void {
    console.log('🔌 SocketService: Attempting to connect with sessionId:', sessionId);
    this.currentSessionId = sessionId;
    
    if (this.socket?.connected) {
      console.log('⚠️ SocketService: Already connected, skipping');
      return;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      console.log('🔄 SocketService: Disconnecting existing socket');
      this.socket.disconnect();
    }

    // Remove /api from the URL since socket.io connects to the base server
    const apiUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
    const serverUrl = apiUrl.replace('/api', '');
    console.log('🌐 SocketService: Connecting to:', serverUrl, '(API URL:', apiUrl, ')');

    this.socket = io(serverUrl, {
      auth: {
        sessionId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    console.log('🔌 SocketService: Disconnecting...');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  isConnected(): boolean {
    const connected = this.socket?.connected ?? false;
    console.log('🔍 SocketService: Connection status:', connected);
    return connected;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ SocketService: Connected to server successfully');
      this.emit('connect');
      
      // Request online data immediately after connection
      setTimeout(() => {
        console.log('📊 SocketService: Requesting online users and agents');
        this.getOnlineUsers();
        this.getOnlineAgents();
      }, 500);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ SocketService: Connection error:', error);
      this.emit('connect_error', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 SocketService: Disconnected from server. Reason:', reason);
      this.emit('disconnect');
    });

    // Authentication error handling
    this.socket.on('error', (error) => {
      console.error('❌ SocketService: Socket error:', error);
      this.emit('error', error);
    });

    // Message events
    this.socket.on('new-message', (data) => {
      console.log('💬 SocketService: New message received:', data);
      this.emit('new-message', data);
    });

    this.socket.on('message-status-updated', (data) => {
      this.emit('message-status-updated', data);
    });

    this.socket.on('chat-history', (data) => {
      console.log('📚 SocketService: Chat history received for room:', data.chatRoomId);
      this.emit('chat-history', data);
    });

    // Room events
    this.socket.on('user-joined-room', (data) => {
      console.log('👤 SocketService: User joined room:', data);
      this.emit('user-joined-room', data);
    });

    this.socket.on('user-left-room', (data) => {
      console.log('👤 SocketService: User left room:', data);
      this.emit('user-left-room', data);
    });

    // Typing events
    this.socket.on('user-typing', (data) => {
      console.log('⌨️ SocketService: User typing event received:', data);
      this.emit('user-typing', data);
    });

    // Status events
    this.socket.on('user-status-changed', (data) => {
      console.log('📱 SocketService: User status changed:', data);
      this.emit('user-status-changed', data);
    });

    this.socket.on('online-users', (data) => {
      console.log('👥 SocketService: Online users received:', data);
      this.emit('online-users', data);
    });

    this.socket.on('online-agents', (data) => {
      console.log('👨‍💼 SocketService: Online agents received:', data);
      this.emit('online-agents', data);
    });

    // Agent assignment events
    this.socket.on('agent-removed', (data) => {
      console.log('🚨 SocketService: Agent removed from chat room:', data);
      this.emit('agent-removed', data);
    });

    this.socket.on('agent-assignment-removed', (data) => {
      console.log('🚨 SocketService: Agent assignment removed event received:', data);
      console.log('🔍 SocketService: Current event listeners for agent-assignment-removed:', this.eventListeners.get('agent-assignment-removed')?.length || 0);
      this.emit('agent-assignment-removed', data);
    });

    this.socket.on('agent-assignment-received', (data) => {
      console.log('✅ SocketService: Agent assignment received:', data);
      this.emit('agent-assignment-received', data);
    });

    this.socket.on('chat-room-updated', (data) => {
      console.log('🔄 SocketService: Chat room updated:', data);
      this.emit('chat-room-updated', data);
    });
  }

  // Event emitter methods
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback as (...args: unknown[]) => void);
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;

    if (callback) {
      const index = listeners.indexOf(callback as (...args: unknown[]) => void);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.set(event, []);
    }
  }

  private emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  // Chat room methods
  joinRoom(chatRoomId: string): void {
    if (!this.socket) return;
    const data: JoinRoomData = { chatRoomId };
    this.socket.emit('join-room', data);
  }

  leaveRoom(chatRoomId: string): void {
    if (!this.socket) return;
    const data: JoinRoomData = { chatRoomId };
    this.socket.emit('leave-room', data);
  }

  // Message methods
  sendMessage(messageData: ChatMessage): void {
    if (!this.socket) return;
    this.socket.emit('send-message', messageData);
  }

  markMessageDelivered(messageId: string): void {
    if (!this.socket) return;
    console.log('📦 SocketService: Marking message as delivered:', messageId);
    this.socket.emit('message-delivered', { messageId });
  }

  markMessageRead(messageId: string): void {
    if (!this.socket) return;
    console.log('👁️ SocketService: Marking message as read:', messageId);
    this.socket.emit('message-read', { messageId });
  }

  // Notify that user is viewing a specific chat room
  setActiveChatRoom(chatRoomId: string | null): void {
    if (!this.socket) return;
    console.log('🎯 SocketService: Setting active chat room:', chatRoomId);
    this.socket.emit('set-active-chat', { chatRoomId });
  }

  // Typing methods
  sendTyping(chatRoomId: string, isTyping: boolean): void {
    if (!this.socket) return;
    const data: TypingData = { chatRoomId, isTyping };
    console.log('⌨️ SocketService: Sending typing event:', data);
    this.socket.emit('typing', data);
  }

  // Status methods
  updateAgentStatus(status: UserStatus): void {
    if (!this.socket) return;
    this.socket.emit('agent-status-update', { status });
  }

  // Request online users
  getOnlineUsers(): void {
    if (!this.socket) return;
    this.socket.emit('get-online-users');
  }

  // Request online agents
  getOnlineAgents(): void {
    if (!this.socket) return;
    this.socket.emit('get-online-agents');
  }

  // Test connection without authentication (for debugging)
  testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const serverUrl = apiUrl.replace('/api', '');
      
      console.log('🧪 SocketService: Testing connection to:', serverUrl);
      
      const testSocket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });

      const timeout = setTimeout(() => {
        console.log('❌ SocketService: Connection test timeout');
        testSocket.disconnect();
        resolve(false);
      }, 10000);

      testSocket.on('connect', () => {
        console.log('✅ SocketService: Connection test successful');
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(true);
      });

      testSocket.on('connect_error', (error) => {
        console.error('❌ SocketService: Connection test failed:', error);
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(false);
      });
    });
  }

  // Get current connection status with details
  getConnectionDetails(): object {
    if (!this.socket) {
      return { status: 'not_initialized', socket: null };
    }

    return {
      status: this.socket.connected ? 'connected' : 'disconnected',
      id: this.socket.id,
      transport: this.socket.io.engine?.transport?.name,
      readyState: this.socket.io.engine?.readyState,
      auth: this.socket.auth
    };
  }

  // Manually reconnect with current session
  reconnect(): void {
    if (this.currentSessionId) {
      console.log('🔄 SocketService: Manual reconnection with sessionId:', this.currentSessionId);
      this.disconnect();
      setTimeout(() => {
        this.connect(this.currentSessionId!);
      }, 1000);
    } else {
      console.error('❌ SocketService: Cannot reconnect - no session ID available');
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService; 