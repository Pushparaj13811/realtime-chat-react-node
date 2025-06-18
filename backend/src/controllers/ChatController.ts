import type { Request, Response } from 'express';
import { ChatRoomService } from '../services/ChatRoomService.js';
import { MessageService } from '../services/MessageService.js';
import { ChatRoom, ChatRoomType, ChatRoomStatus } from '../models/ChatRoom.js';
import { UserRole } from '../models/User.js';
import { AuthService } from '../services/AuthService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class ChatController {
  private chatRoomService: ChatRoomService;
  private messageService: MessageService;
  private authService: AuthService;

  constructor() {
    this.chatRoomService = ChatRoomService.getInstance();
    this.messageService = MessageService.getInstance();
    this.authService = AuthService.getInstance();
  }

  // Create a new chat room
  createChatRoom = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      const { type, participants = [], name, assignedAgent, metadata } = req.body;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      if (!type) {
        throw new ApiError(400, 'Type is required');
      }

      console.log(`📝 ChatController: Creating chat room for user ${userId}:`, {
        type,
        participants,
        assignedAgent,
        metadata
      });

      // Ensure participants is an array
      const participantIds = Array.isArray(participants) ? participants : [];
      
      // Add current user to participants if not already included
      const allParticipants = participantIds.includes(userId) 
        ? participantIds 
        : [...participantIds, userId];

      console.log(`👥 ChatController: Final participants list:`, allParticipants);

      const chatRoom = await this.chatRoomService.createChatRoom({
        type,
        createdBy: userId,
        participants: allParticipants,
        name,
        assignedAgent,
        metadata
      });

      if (chatRoom) {
        const response = new ApiResponse(201, 'Chat room created', chatRoom);
        res.status(201).json(response.toJSON());
      } else {
        throw new ApiError(400, 'Failed to create chat room');
    }
  };

  // Get user's chat rooms
  getUserChatRooms = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      const { type } = req.query;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const chatRooms = await this.chatRoomService.getUserChatRooms(
        userId,
        type as ChatRoomType
      );

      const response = new ApiResponse(200, 'User chat rooms fetched', chatRooms);
      res.status(200).json(response.toJSON());
  };

  // Get agent's assigned chat rooms
  getAgentChatRooms = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { status } = req.query;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Only agents can access this endpoint
      if (!this.authService.hasPermission(userRole, UserRole.AGENT)) {
        throw new ApiError(403, 'Agent access required');
      }

      const chatRooms = await this.chatRoomService.getAgentChatRooms(
        userId,
        status as ChatRoomStatus
      );

      const response = new ApiResponse(200, 'Agent chat rooms fetched', chatRooms);
      res.status(200).json(response.toJSON());
  };

  // Get chat room by ID
  getChatRoom = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      const { chatRoomId } = req.params;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const chatRoom = await this.chatRoomService.getChatRoomById(chatRoomId);

      if (!chatRoom) {
        throw new ApiError(404, 'Chat room not found');
      }

      // Check if user has access to this chat room
      const isParticipant = chatRoom.participants.some(
        p => p._id.toString() === userId
      );
      const isAssignedAgent = chatRoom.assignedAgent?._id.toString() === userId;

      if (!isParticipant && !isAssignedAgent) {
        throw new ApiError(403, 'Access denied');
      }

      const response = new ApiResponse(200, 'Chat room fetched', chatRoom);
      res.status(200).json(response.toJSON());
  };

  // Get messages for a chat room
  getMessages = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      const { chatRoomId } = req.params;
      const { page = 1, limit = 50, before, after } = req.query;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Verify user has access to this chat room
      const chatRoom = await this.chatRoomService.getChatRoomById(chatRoomId);
      if (!chatRoom) {
        throw new ApiError(404, 'Chat room not found');
      }

      const isParticipant = chatRoom.participants.some(
        p => p._id.toString() === userId
      );
      const isAssignedAgent = chatRoom.assignedAgent?._id.toString() === userId;

      if (!isParticipant && !isAssignedAgent) {
        throw new ApiError(403, 'Access denied');
      }

      const messages = await this.messageService.getMessages({
        chatRoomId,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        before: before ? new Date(before as string) : undefined,
        after: after ? new Date(after as string) : undefined
      });

      const response = new ApiResponse(200, 'Messages fetched', messages);
      res.status(200).json(response.toJSON());
  };

  // Assign agent to chat room
  assignAgent = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { chatRoomId, agentId, reason } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    // Only agents and admins can assign agents
      if (!this.authService.hasPermission(userRole, UserRole.AGENT)) {
        throw new ApiError(403, 'Agent access required');
      }

      if (!chatRoomId || !agentId) {
        throw new ApiError(400, 'Chat room ID and agent ID are required');
      }

      const success = await this.chatRoomService.assignAgent({
        chatRoomId,
        agentId,
        reason
      });

      const response = new ApiResponse(200, success ? 'Agent assigned successfully' : 'Failed to assign agent');
      res.status(200).json(response.toJSON());
  };

  // Transfer chat to another agent
  transferChat = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { chatRoomId, toAgentId, reason } = req.body;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Only agents can transfer chats
      if (!this.authService.hasPermission(userRole, UserRole.AGENT)) {
        throw new ApiError(403, 'Agent access required');
      }

      if (!chatRoomId || !toAgentId) {
        throw new ApiError(400, 'Chat room ID and target agent ID are required');
      }

      const success = await this.chatRoomService.transferChat(
        chatRoomId,
        userId,
        toAgentId,
        reason
      );

      const response = new ApiResponse(200, success ? 'Chat transferred successfully' : 'Failed to transfer chat');
      res.status(200).json(response.toJSON());
  };

  // Close chat room
  closeChatRoom = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
    const { chatRoomId } = req.body;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

    if (!chatRoomId) {
      throw new ApiError(400, 'Chat room ID is required');
    }

    // Only agents and admins can close chat rooms
      if (!this.authService.hasPermission(userRole, UserRole.AGENT)) {
        throw new ApiError(403, 'Agent access required');
      }

      const success = await this.chatRoomService.closeChatRoom(chatRoomId, userId);

      const response = new ApiResponse(200, success ? 'Chat room closed successfully' : 'Failed to close chat room');
      res.status(200).json(response.toJSON());
  };

  // Get unread message count
  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
      const { chatRoomId } = req.query;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

    let unreadData;

    if (chatRoomId) {
      // Get unread count for specific room
      const count = await this.messageService.getUnreadCountForRoom(userId, chatRoomId as string, userRole);
      unreadData = { chatRoomId, count };
    } else {
      // Get unread counts for all rooms and total
      const [perRoom, total] = await Promise.all([
        this.messageService.getUnreadCountsPerRoom(userId, userRole),
        this.messageService.getTotalUnreadCount(userId, userRole)
      ]);
      unreadData = { total, perRoom };
    }

    const response = new ApiResponse(200, 'Unread count fetched', unreadData);
      res.status(200).json(response.toJSON());
  };

  // Search messages
  searchMessages = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
    const { chatRoomId, searchTerm, limit = 20 } = req.query;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

    if (!chatRoomId || !searchTerm) {
      throw new ApiError(400, 'Chat room ID and search term are required');
      }

      // Verify user has access to this chat room
    const chatRoom = await this.chatRoomService.getChatRoomById(chatRoomId as string);
      if (!chatRoom) {
        throw new ApiError(404, 'Chat room not found');
      }

      const isParticipant = chatRoom.participants.some(
        p => p._id.toString() === userId
      );
      const isAssignedAgent = chatRoom.assignedAgent?._id.toString() === userId;

      if (!isParticipant && !isAssignedAgent) {
        throw new ApiError(403, 'Access denied');
      }

      const messages = await this.messageService.searchMessages(
      chatRoomId as string,
        searchTerm as string,
        parseInt(limit as string)
      );

    const response = new ApiResponse(200, 'Messages searched', messages);
      res.status(200).json(response.toJSON());
  };

  // Get chat room statistics (admin only)
  getChatRoomStats = async (req: Request, res: Response): Promise<void> => {
      const userRole = (req as any).user?.role;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      const stats = await this.chatRoomService.getChatRoomStats();

      const response = new ApiResponse(200, 'Chat room stats fetched', stats);
      res.status(200).json(response.toJSON());
  };

  // Get online users
  getOnlineUsers = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

    const onlineUsers = await this.authService.getOnlineAgents();

      const response = new ApiResponse(200, 'Online users fetched', onlineUsers);
      res.status(200).json(response.toJSON());
  };

  // Get online agents
  getOnlineAgents = async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const onlineAgents = await this.authService.getOnlineAgents();

      const response = new ApiResponse(200, 'Online agents fetched', onlineAgents);
      res.status(200).json(response.toJSON());
  };

  // Admin: Transfer agent between chats
  transferAgentBetweenChats = async (req: Request, res: Response): Promise<void> => {
    const userRole = (req as any).user?.role;
      const userId = (req as any).user?.userId;
      const { fromChatId, toChatId, agentId, reason } = req.body;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      if (!fromChatId || !toChatId || !agentId) {
        throw new ApiError(400, 'From chat ID, to chat ID, and agent ID are required');
      }

      const success = await this.chatRoomService.transferAgentBetweenChats(
        fromChatId,
        toChatId,
        agentId,
        userId,
        reason
      );

    if (!success) {
      throw new ApiError(400, 'Failed to transfer agent between chats');
    }

    const response = new ApiResponse(200, 'Agent transferred between chats successfully');
      res.status(200).json(response.toJSON());
  };

  // Admin: Remove agent from chat
  removeAgentFromChat = async (req: Request, res: Response): Promise<void> => {
    const userRole = (req as any).user?.role;
      const userId = (req as any).user?.userId;
    const { chatRoomId, reason } = req.body;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

    if (!chatRoomId) {
      throw new ApiError(400, 'Chat room ID is required');
    }

    const success = await this.chatRoomService.removeAgentFromChat(
      chatRoomId,
      userId,
      reason
    );

    if (!success) {
      throw new ApiError(400, 'Failed to remove agent from chat');
    }

    const response = new ApiResponse(200, 'Agent removed from chat successfully');
      res.status(200).json(response.toJSON());
  };

  // Admin: Get all chat rooms
  getAllChatRoomsAdmin = async (req: Request, res: Response): Promise<void> => {
    const userRole = (req as any).user?.role;

    if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
      throw new ApiError(403, 'Admin access required');
    }

    // Get all chat rooms for admin - not limited to user's participation
    const chatRooms = await ChatRoom.find({ isActive: true })
      .populate([
        { path: 'participants', select: 'username email role status isOnline' },
        { path: 'assignedAgent', select: 'username email role status isOnline' },
        { path: 'lastMessage', select: 'content messageType createdAt senderId' }
      ])
      .sort({ lastActivity: -1 });

    const response = new ApiResponse(200, 'All chat rooms fetched', chatRooms);
    res.status(200).json(response.toJSON());
  };

  // Admin: Get agent workload statistics
  getAgentWorkloadStats = async (req: Request, res: Response): Promise<void> => {
      const userRole = (req as any).user?.role;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      const stats = await this.chatRoomService.getAgentWorkloadStats();

      const response = new ApiResponse(200, 'Agent workload stats fetched', stats);
      res.status(200).json(response.toJSON());
  };

  // Admin: Transfer agent
  transferAgentAdmin = async (req: Request, res: Response): Promise<void> => {
    const userRole = (req as any).user?.role;
    const { chatRoomId, agentId, fromChatId, toChatId, reason } = req.body;

    if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
      throw new ApiError(403, 'Admin access required');
    }

    let success = false;

    // Check if this is a transfer between two chats
    if (fromChatId && toChatId && agentId) {
      // Transfer agent between chats
      if (!fromChatId || !toChatId || !agentId) {
        throw new ApiError(400, 'From chat ID, to chat ID, and agent ID are required for chat-to-chat transfer');
      }

      success = await this.chatRoomService.transferAgentBetweenChats(
        fromChatId,
        toChatId,
        agentId,
        (req as any).user?.userId,
        reason
      );

      if (!success) {
        throw new ApiError(400, 'Failed to transfer agent between chats');
      }

      const response = new ApiResponse(200, 'Agent transferred between chats successfully');
      res.status(200).json(response.toJSON());
    } else if (chatRoomId && agentId) {
      // Single chat room agent assignment/replacement
      success = await this.chatRoomService.assignAgent({
        chatRoomId,
        agentId,
        reason: reason || 'Admin transfer'
      });

      if (!success) {
        throw new ApiError(400, 'Failed to assign agent to chat room');
      }

      const response = new ApiResponse(200, 'Agent assigned to chat room successfully');
      res.status(200).json(response.toJSON());
    } else {
      throw new ApiError(400, 'Invalid parameters. Either provide (chatRoomId, agentId) for assignment or (fromChatId, toChatId, agentId) for transfer');
    }
  };

  // Admin: Assign agent
  assignAgentAdmin = async (req: Request, res: Response): Promise<void> => {
    const userRole = (req as any).user?.role;
    const { chatRoomId, agentId, reason } = req.body;

    if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
      throw new ApiError(403, 'Admin access required');
    }

    if (!chatRoomId || !agentId) {
      throw new ApiError(400, 'Chat room ID and agent ID are required');
    }

    const success = await this.chatRoomService.assignAgent({
      chatRoomId,
      agentId,
      reason
    });

    if (!success) {
      throw new ApiError(400, 'Failed to assign agent');
    }

    const response = new ApiResponse(200, 'Agent assigned successfully');
    res.status(200).json(response.toJSON());
  };

  // Admin: Remove agent
  removeAgentAdmin = async (req: Request, res: Response): Promise<void> => {
    const userRole = (req as any).user?.role;
    const { chatRoomId, reason } = req.body;

    if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
      throw new ApiError(403, 'Admin access required');
    }

    if (!chatRoomId) {
      throw new ApiError(400, 'Chat room ID is required');
    }

    const success = await this.chatRoomService.removeAgentFromChat(
      chatRoomId,
      (req as any).user?.userId,
      reason
    );

    if (!success) {
      throw new ApiError(400, 'Failed to remove agent');
    }

    const response = new ApiResponse(200, 'Agent removed successfully');
    res.status(200).json(response.toJSON());
  };
} 