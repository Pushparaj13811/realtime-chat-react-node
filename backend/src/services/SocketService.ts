import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { AuthService } from './AuthService.js';
import { MessageService } from './MessageService.js';
import { ChatRoomService } from './ChatRoomService.js';
import { CacheService } from './CacheService.js';
import { UserStatus } from '../types/index.js';
import type { 
  ISocketService,
  SocketUser, 
  ChatMessage, 
  JoinRoomData, 
  TypingData,
  AuthSession
} from '../interfaces/services.interfaces.js';
import { config } from '../config/config.js';
import { User } from '../models/User.js';
import { ChatRoom } from '../models/ChatRoom.js';
import { UserRole } from '../types/index.js';

export class SocketService implements ISocketService {
  private static instance: SocketService;
  private io!: SocketServer; // Use definite assignment assertion
  private authService: AuthService;
  private messageService: MessageService;
  private chatRoomService: ChatRoomService;
  private cacheService: CacheService;
  private connectedUsers: Map<string, SocketUser> = new Map();

  private constructor() {
    this.authService = AuthService.getInstance();
    this.messageService = MessageService.getInstance();
    this.chatRoomService = ChatRoomService.getInstance();
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Initialize Socket.IO server
  initialize(server: HttpServer): void {
    this.io = new SocketServer(server, {
      cors: {
        origin: config.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        console.log('🔐 SocketService: Authenticating socket connection...');
        const sessionId = socket.handshake.auth.sessionId;
        
        if (!sessionId) {
          console.error('❌ SocketService: No session ID provided');
          return next(new Error('Authentication error: No session ID'));
        }

        console.log('🔍 SocketService: Validating session:', sessionId);
        const session = await this.authService.validateSession(sessionId);
        
        if (!session) {
          console.error('❌ SocketService: Invalid session ID:', sessionId);
          return next(new Error('Authentication error: Invalid session'));
        }

        console.log('✅ SocketService: Session validated for user:', session.username);
        socket.data.user = session;
        next();
      } catch (error) {
        console.error('❌ SocketService: Authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Start periodic cleanup of stale connections
    this.startStatusCleanup();

    console.log('Socket.IO server initialized');
  }

  // Periodic cleanup of stale connections and status synchronization
  private startStatusCleanup(): void {
    setInterval(async () => {
      try {
        console.log('SocketService: Running status cleanup...');
        
        // Get all users marked as online in database
        const onlineUsersInDB = await User.find({ isOnline: true }).select('_id username');
        
        // Get actually connected user IDs
        const connectedUserIds = Array.from(this.connectedUsers.values()).map(u => u.userId);
        
        // Find users marked as online but not connected
        const staleOnlineUsers = onlineUsersInDB.filter(user => 
          !connectedUserIds.includes((user._id as any).toString())
        );
        
        // Mark stale users as offline
        if (staleOnlineUsers.length > 0) {
          console.log(`SocketService: Marking ${staleOnlineUsers.length} stale users as offline`);
          await User.updateMany(
            { _id: { $in: staleOnlineUsers.map(u => u._id) } },
            { 
              isOnline: false, 
              status: UserStatus.OFFLINE,
              lastSeen: new Date(),
              socketId: undefined
            }
          );
          
          // Broadcast status changes
          for (const user of staleOnlineUsers) {
            await this.broadcastUserStatusChange((user._id as any).toString(), UserStatus.OFFLINE);
          }
        }
        
        console.log(`SocketService: Status cleanup complete. ${connectedUserIds.length} users connected, ${staleOnlineUsers.length} stale users cleaned`);
      } catch (error) {
        console.error('SocketService: Status cleanup error:', error);
      }
    }, 60000); // Run every minute
  }

  // Handle new socket connection
  private async handleConnection(socket: Socket): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      // Add to connected users
      this.connectedUsers.set(socket.id, {
        userId: user.userId,
        username: user.username,
        role: user.role,
        socketId: socket.id
      });

      // Update user status in database and cache
      await this.authService.updateUserStatus(user.userId, UserStatus.ONLINE, socket.id);
      await this.cacheService.setUserOnline(user.userId, socket.id);

      console.log(`User ${user.username} connected with socket ${socket.id}`);

      // Join user to their chat rooms
      await this.joinUserChatRooms(socket, user.userId);

      // Notify other users about online status
      await this.broadcastUserStatusChange(user.userId, UserStatus.ONLINE);

      // Set up event handlers
      this.setupEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    } catch (error) {
      console.error('Error handling connection:', error);
      socket.disconnect();
    }
  }

  // Set up event handlers for socket
  private setupEventHandlers(socket: Socket): void {
    // Join specific chat room
    socket.on('join-room', async (data: JoinRoomData) => {
      await this.handleJoinRoom(socket, data);
    });

    // Leave specific chat room
    socket.on('leave-room', async (data: JoinRoomData) => {
      await this.handleLeaveRoom(socket, data);
    });

    // Send message
    socket.on('send-message', async (data: ChatMessage) => {
      await this.handleSendMessage(socket, data);
    });

    // Mark message as delivered
    socket.on('message-delivered', async (data: { messageId: string }) => {
      await this.handleMessageDelivered(socket, data);
    });

    // Mark message as read
    socket.on('message-read', async (data: { messageId: string }) => {
      await this.handleMessageRead(socket, data);
    });

    // Typing indicators
    socket.on('typing', async (data: TypingData) => {
      await this.handleTyping(socket, data);
    });

    // Agent status update
    socket.on('agent-status-update', async (data: { status: UserStatus }) => {
      await this.handleAgentStatusUpdate(socket, data);
    });

    // Get online users
    socket.on('get-online-users', async () => {
      await this.handleGetOnlineUsers(socket);
    });

    // Get online agents (for admin/user)
    socket.on('get-online-agents', async () => {
      await this.handleGetOnlineAgents(socket);
    });

    // Set active chat room for user
    socket.on('set-active-chat', async (data: { chatRoomId: string | null }) => {
      await this.handleSetActiveChat(socket, data);
    });
  }

  // Handle joining a chat room
  private async handleJoinRoom(socket: Socket, data: JoinRoomData): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      const { chatRoomId } = data;

      console.log(`🏠 SocketService: User ${user.username} trying to join room ${chatRoomId}`);

      // Verify user has access to this chat room
      const chatRoom = await this.chatRoomService.getChatRoomById(chatRoomId);
      if (!chatRoom) {
        console.error(`❌ SocketService: Chat room ${chatRoomId} not found`);
        socket.emit('error', { message: 'Chat room not found' });
        return;
      }

      const isParticipant = chatRoom.participants.some(
        p => this.extractId(p) === user.userId
      );
      const isAssignedAgent = this.extractId(chatRoom.assignedAgent) === user.userId;

      const participantIds = chatRoom.participants.map(p => this.extractId(p));
      const assignedAgentId = this.extractId(chatRoom.assignedAgent);
      
      console.log(`🔍 SocketService: Room access check for ${user.username}:`, {
        chatRoomId,
        userId: user.userId,
        isParticipant,
        isAssignedAgent,
        participantIds,
        assignedAgentId,
        participantObjects: chatRoom.participants.map(p => ({ id: this.extractId(p), type: typeof p }))
      });

      if (!isParticipant && !isAssignedAgent) {
        console.error(`❌ SocketService: Access denied to room ${chatRoomId} for user ${user.username}`);
        socket.emit('error', { message: 'Access denied to chat room' });
        return;
      }

      // Join the room
      await socket.join(chatRoomId);

      // Get recent messages from cache
      const recentMessages = await this.cacheService.getRecentMessages(chatRoomId);
      
      // If no cached messages, get from database
      if (recentMessages.length === 0) {
        const messages = await this.messageService.getMessages({
          chatRoomId,
          limit: 20
        });
        socket.emit('chat-history', { chatRoomId, messages });
      } else {
        socket.emit('chat-history', { chatRoomId, messages: recentMessages });
      }

      // Notify others in the room
      socket.to(chatRoomId).emit('user-joined-room', {
        userId: user.userId,
        username: user.username,
        chatRoomId
      });

      console.log(`User ${user.username} joined room ${chatRoomId}`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  // Handle leaving a chat room
  private async handleLeaveRoom(socket: Socket, data: JoinRoomData): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      const { chatRoomId } = data;

      await socket.leave(chatRoomId);

      socket.to(chatRoomId).emit('user-left-room', {
        userId: user.userId,
        username: user.username,
        chatRoomId
      });

      console.log(`User ${user.username} left room ${chatRoomId}`);
    } catch (error) {
      console.error('Leave room error:', error);
    }
  }

  // Handle sending a message
  private async handleSendMessage(socket: Socket, data: ChatMessage): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      console.log(`💬 SocketService: User ${user.username} sending message to room ${data.chatRoomId}:`, {
        content: data.content,
        messageType: data.messageType
      });

      // Check messaging permissions for support chat rooms
      const isMessageAllowed = await this.checkMessagingPermissions(user, data.chatRoomId);
      if (!isMessageAllowed) {
        console.log(`❌ SocketService: User ${user.username} not allowed to send first message in support room ${data.chatRoomId}`);
        socket.emit('error', { message: 'Only assigned agents can initiate conversation in support chat rooms' });
        return;
      }
      
      // Create message in database
      const message = await this.messageService.createMessage({
        chatRoomId: data.chatRoomId,
        senderId: user.userId,
        content: data.content,
        messageType: data.messageType as any,
        replyTo: data.replyTo,
        metadata: data.metadata
      });

      if (!message) {
        socket.emit('error', { message: 'Failed to send message' });
        return;
      }

      // Broadcast to all users in the chat room
      this.io.to(data.chatRoomId).emit('new-message', {
        message,
        sender: {
          id: user.userId,
          username: user.username,
          role: user.role
        }
      });

      // Mark as delivered only for users actively viewing this chat room
      const roomSockets = await this.io.in(data.chatRoomId).fetchSockets();
      const messageId = this.extractId(message._id) || this.extractId(message.id) || '';
      
      if (messageId) {
        for (const roomSocket of roomSockets) {
          const roomUser: AuthSession = roomSocket.data.user;
          // Only mark as delivered if user is actively viewing this chat room
          if (roomUser.userId !== user.userId && roomSocket.data.activeChatRoomId === data.chatRoomId) {
            await this.messageService.markAsDelivered(messageId, roomUser.userId);
            
            // Notify sender about delivery
            this.io.emit('message-status-updated', {
              messageId: messageId,
              status: 'delivered',
              userId: roomUser.userId
            });
          }
        }
      }

      console.log(`Message sent in room ${data.chatRoomId} by ${user.username}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  // Handle message delivered acknowledgment
  private async handleMessageDelivered(socket: Socket, data: { messageId: string }): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      const success = await this.messageService.markAsDelivered(data.messageId, user.userId);
      if (success) {
        // Notify sender about delivery
        socket.broadcast.emit('message-status-updated', {
          messageId: data.messageId,
          status: 'delivered',
          userId: user.userId
        });
      }
    } catch (error) {
      console.error('Message delivered error:', error);
    }
  }

  // Handle message read acknowledgment
  private async handleMessageRead(socket: Socket, data: { messageId: string }): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      const success = await this.messageService.markAsRead(data.messageId, user.userId);
      if (success) {
        // Notify sender about read status
        socket.broadcast.emit('message-status-updated', {
          messageId: data.messageId,
          status: 'read',
          userId: user.userId
        });
      }
    } catch (error) {
      console.error('Message read error:', error);
    }
  }

  // Handle typing indicators
  private async handleTyping(socket: Socket, data: TypingData): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      console.log(`⌨️ SocketService: Handling typing event from ${user.username}:`, {
        chatRoomId: data.chatRoomId,
        isTyping: data.isTyping,
        userId: user.userId
      });
      
      const typingData = {
        userId: user.userId,
        username: user.username,
        chatRoomId: data.chatRoomId,
        isTyping: data.isTyping
      };
      
      // Broadcast to other users in the room (excluding sender)
      socket.to(data.chatRoomId).emit('user-typing', typingData);
      
      console.log(`⌨️ SocketService: Broadcasted typing event to room ${data.chatRoomId} (excluding sender)`);
    } catch (error) {
      console.error('Typing error:', error);
    }
  }

  // Handle agent status updates
  private async handleAgentStatusUpdate(socket: Socket, data: { status: UserStatus }): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      // Only agents can update their status
      if (!this.authService.hasPermission(user.role as any, 'agent' as any)) {
        socket.emit('error', { message: 'Permission denied' });
        return;
      }

      await this.authService.updateUserStatus(user.userId, data.status, socket.id);
      await this.cacheService.setAgentStatus(user.userId, data.status);

      // Broadcast status change
      await this.broadcastUserStatusChange(user.userId, data.status);
    } catch (error) {
      console.error('Agent status update error:', error);
    }
  }

  // Handle get online users request
  private async handleGetOnlineUsers(socket: Socket): Promise<void> {
    try {
      const requestingUser: AuthSession = socket.data.user;
      
      // Get currently connected users from the socket connections who are also marked as online in database
      const connectedUserIds = Array.from(this.connectedUsers.values()).map(user => user.userId);
      
      // Verify these users are actually online in the database
      const onlineUsers = await User.find({
        _id: { $in: connectedUserIds },
        isOnline: true,
        role: UserRole.USER // Only show actual users, not agents or admins
      }).select('_id username role status');

      let filteredUsers = onlineUsers;

      // Apply role-based filtering
      if (requestingUser.role === UserRole.USER) {
        // Users can only see agents they are chatting with
        const userChatRooms = await this.chatRoomService.getUserChatRooms(requestingUser.userId);
        const agentIds = userChatRooms
          .map(room => this.extractId(room.assignedAgent))
          .filter(id => id);
        
        // Users see no other users, only their assigned agents (handled in handleGetOnlineAgents)
        filteredUsers = [];
      } else if (requestingUser.role === UserRole.AGENT) {
        // Agents can only see users they are assigned to
        const agentChatRooms = await this.chatRoomService.getAgentChatRooms(requestingUser.userId);
        const participantIds = agentChatRooms
          .flatMap(room => room.participants.map(p => this.extractId(p)))
          .filter(id => id);
        
        filteredUsers = onlineUsers.filter(user => 
          participantIds.includes((user._id as any).toString())
        );
      }
      // Admins can see all users (no filtering needed)

      // Map to SocketUser format
      const socketUsers = filteredUsers.map(user => {
        const connectedUser = Array.from(this.connectedUsers.values())
          .find(cu => cu.userId === (user._id as any).toString());
        
        return {
          userId: (user._id as any).toString(),
          username: user.username,
          role: user.role,
          socketId: connectedUser?.socketId || ''
        };
      });
      
      socket.emit('online-users', socketUsers);
    } catch (error) {
      console.error('Get online users error:', error);
      socket.emit('online-users', []); // Send empty array on error
    }
  }

  // Handle get online agents request
  private async handleGetOnlineAgents(socket: Socket): Promise<void> {
    try {
      const requestingUser: AuthSession = socket.data.user;
      
      // Get agents who are currently connected via sockets AND marked as online in database
      const connectedAgentIds = Array.from(this.connectedUsers.values())
        .filter(user => user.role === 'agent' || user.role === 'admin')
        .map(user => user.userId);
      
      // Get full agent data from database for connected agents
      const onlineAgents = await User.find({
        _id: { $in: connectedAgentIds },
        isOnline: true,
        role: { $in: [UserRole.AGENT, UserRole.ADMIN] }
      }).select('-password');

      let filteredAgents = onlineAgents;

      // Apply role-based filtering
      if (requestingUser.role === UserRole.USER) {
        // Users can only see agents they are chatting with
        const userChatRooms = await this.chatRoomService.getUserChatRooms(requestingUser.userId);
        const agentIds = userChatRooms
          .map(room => this.extractId(room.assignedAgent))
          .filter(id => id);
        
        filteredAgents = onlineAgents.filter(agent => 
          agentIds.includes((agent._id as any).toString())
        );
      } else if (requestingUser.role === UserRole.AGENT) {
        // Agents can see all other agents and admins (for collaboration)
        filteredAgents = onlineAgents.filter(agent => 
          (agent._id as any).toString() !== requestingUser.userId
        );
      }
      // Admins can see all agents (no filtering needed)

      socket.emit('online-agents', filteredAgents);
    } catch (error) {
      console.error('Get online agents error:', error);
      socket.emit('online-agents', []); // Send empty array on error
    }
  }

  // Handle setting active chat room for user
  private async handleSetActiveChat(socket: Socket, data: { chatRoomId: string | null }): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      console.log(`🎯 SocketService: User ${user.username} set active chat:`, data.chatRoomId);
      
      // Store the active chat room in socket data for message status logic
      socket.data.activeChatRoomId = data.chatRoomId;
      
      // If user is viewing a chat room, mark undelivered messages in that room as delivered
      if (data.chatRoomId) {
        const messages = await this.messageService.getMessages({
          chatRoomId: data.chatRoomId,
          limit: 50
        });
        
        // Mark undelivered messages as delivered
        for (const message of messages) {
          const messageId = this.extractId(message._id) || this.extractId(message.id) || '';
          const senderId = this.extractId(message.senderId) || '';
          
          if (messageId && senderId !== user.userId) {
            // Check if not already delivered to this user
            const isDelivered = message.deliveredTo?.some(delivery => 
              delivery.userId.toString() === user.userId
            );
            
            if (!isDelivered) {
              await this.messageService.markAsDelivered(messageId, user.userId);
              
              // Notify sender about delivery
              this.io.emit('message-status-updated', {
                messageId: messageId,
                status: 'delivered',
                userId: user.userId
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Set active chat error:', error);
    }
  }

  // Handle socket disconnection
  private async handleDisconnection(socket: Socket): Promise<void> {
    try {
      const user: AuthSession = socket.data.user;
      
      if (user) {
        console.log(`User ${user.username} disconnecting...`);

        // Remove from connected users immediately
        this.connectedUsers.delete(socket.id);

        // Check if user has other active socket connections
        const hasOtherConnections = Array.from(this.connectedUsers.values())
          .some(connectedUser => connectedUser.userId === user.userId);

        // Only mark as offline if no other connections exist
        if (!hasOtherConnections) {
          console.log(`User ${user.username} going offline (no other connections)`);
          
          // Update user status in database
          await this.authService.updateUserStatus(user.userId, UserStatus.OFFLINE);
          await this.cacheService.setUserOffline(user.userId);

          // Notify others about offline status
          await this.broadcastUserStatusChange(user.userId, UserStatus.OFFLINE);
        } else {
          console.log(`User ${user.username} still has other active connections`);
        }
      }
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  }

  // Join user to all their chat rooms
  private async joinUserChatRooms(socket: Socket, userId: string): Promise<void> {
    try {
      const chatRooms = await this.chatRoomService.getUserChatRooms(userId);
      for (const room of chatRooms) {
        const roomId = this.extractId(room._id) || this.extractId(room.id) || '';
        if (roomId) {
          await socket.join(roomId);
        }
      }
    } catch (error) {
      console.error('Error joining user chat rooms:', error);
    }
  }

  // Broadcast user status change
  private async broadcastUserStatusChange(userId: string, status: UserStatus): Promise<void> {
    try {
      this.io.emit('user-status-changed', {
        userId,
        status,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error broadcasting user status change:', error);
    }
  }

  // Get Socket.IO instance
  getIO(): SocketServer {
    return this.io;
  }

  // Send message to specific user
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      const socketId = await this.cacheService.getUserSocketId(userId);
      if (socketId) {
        this.io.to(socketId).emit(event, data);
      }
    } catch (error) {
      console.error('Error sending to user:', error);
    }
  }

  // Send message to chat room
  async sendToRoom(chatRoomId: string, event: string, data: any): Promise<void> {
    try {
      this.io.to(chatRoomId).emit(event, data);
    } catch (error) {
      console.error('Error sending to room:', error);
    }
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users in a room
  async getRoomUsers(chatRoomId: string): Promise<SocketUser[]> {
    try {
      const roomSockets = await this.io.in(chatRoomId).fetchSockets();
      return roomSockets
        .map(socket => socket.data.user)
        .filter(user => user)
        .map(user => ({
          userId: user.userId,
          username: user.username,
          role: user.role,
          socketId: user.socketId
        }));
    } catch (error) {
      console.error('Error getting room users:', error);
      return [];
    }
  }

  // Check if user can send messages in a chat room (enhanced agent access control)
  private async checkMessagingPermissions(user: AuthSession, chatRoomId: string): Promise<boolean> {
    try {
      // Get the chat room
      const chatRoom = await ChatRoom.findById(chatRoomId).populate('assignedAgent participants');

      if (!chatRoom) {
        return false;
      }

      console.log(`🔍 SocketService: Checking messaging permissions for room ${chatRoomId}:`, {
        userRole: user.role,
        userId: user.userId,
        roomType: chatRoom.type,
        assignedAgentId: this.extractId(chatRoom.assignedAgent),
        isParticipant: chatRoom.participants.some(p => this.extractId(p) === user.userId)
      });

      // Check if user is a participant in the chat room
      const isParticipant = chatRoom.participants.some(p => this.extractId(p) === user.userId);
      const isAssignedAgent = this.extractId(chatRoom.assignedAgent) === user.userId;
      const isAdmin = user.role === 'admin';

      // For non-support rooms, only participants can message
      if (chatRoom.type !== 'support') {
        return isParticipant || isAdmin;
      }

      // For support rooms, enhanced access control:
      // 1. If user is a regular participant (customer), they can always message
      if (isParticipant && user.role === 'user') {
        return true;
      }

      // 2. If user is the assigned agent, they can always message
      if (isAssignedAgent) {
        return true;
      }

      // 3. If user is an admin, they can always message
      if (isAdmin) {
        return true;
      }

      // 4. If user is an agent but NOT assigned to this room, deny access
      if (user.role === 'agent' && !isAssignedAgent) {
        console.log(`❌ SocketService: Agent ${user.username} denied access to room ${chatRoomId} - not assigned`);
        return false;
      }

      // 5. For all other cases, deny access
      console.log(`❌ SocketService: User ${user.username} denied access to room ${chatRoomId} - insufficient permissions`);
      return false;
    } catch (error) {
      console.error('Check messaging permissions error:', error);
      return false;
    }
  }

  // Utility method to safely extract ID from MongoDB ObjectId or string
  private extractId(id: any): string | undefined {
    if (!id) return undefined;
    if (typeof id === 'string') return id;
    if (typeof id === 'object') {
      // Handle populated mongoose documents
      if (id._id) return id._id.toString();
      // Handle ObjectId
      if (id.toString) return id.toString();
    }
    return undefined;
  }
}

// Export interfaces for use in other files
export type { 
  SocketUser, 
  ChatMessage, 
  JoinRoomData, 
  TypingData 
} from '../interfaces/services.interfaces.js'; 