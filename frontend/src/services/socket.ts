import { io, type Socket } from 'socket.io-client';
import type { 
  Message, 
  ChatMessage, 
  JoinRoomData, 
  TypingData, 
  UserTyping,
  SocketUser,
  UserStatus,
  User
} from '../types';

interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  
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
  
  // Error events
  error: (data: { message: string }) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  connect(sessionId: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: {
        sessionId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.emit('connect');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.emit('disconnect');
    });

    // Message events
    this.socket.on('new-message', (data) => {
      this.emit('new-message', data);
    });

    this.socket.on('message-status-updated', (data) => {
      this.emit('message-status-updated', data);
    });

    this.socket.on('chat-history', (data) => {
      this.emit('chat-history', data);
    });

    // Room events
    this.socket.on('user-joined-room', (data) => {
      this.emit('user-joined-room', data);
    });

    this.socket.on('user-left-room', (data) => {
      this.emit('user-left-room', data);
    });

    // Typing events
    this.socket.on('user-typing', (data) => {
      this.emit('user-typing', data);
    });

    // Status events
    this.socket.on('user-status-changed', (data) => {
      this.emit('user-status-changed', data);
    });

    this.socket.on('online-users', (data) => {
      this.emit('online-users', data);
    });

    this.socket.on('online-agents', (data) => {
      this.emit('online-agents', data);
    });

    // Error events
    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      this.emit('error', data);
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
    this.socket.emit('message-delivered', { messageId });
  }

  markMessageRead(messageId: string): void {
    if (!this.socket) return;
    this.socket.emit('message-read', { messageId });
  }

  // Typing methods
  sendTyping(chatRoomId: string, isTyping: boolean): void {
    if (!this.socket) return;
    const data: TypingData = { chatRoomId, isTyping };
    this.socket.emit('typing', data);
  }

  // Status methods
  updateAgentStatus(status: UserStatus): void {
    if (!this.socket) return;
    this.socket.emit('agent-status-update', { status });
  }

  getOnlineUsers(): void {
    if (!this.socket) return;
    this.socket.emit('get-online-users');
  }

  getOnlineAgents(): void {
    if (!this.socket) return;
    this.socket.emit('get-online-agents');
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService; 