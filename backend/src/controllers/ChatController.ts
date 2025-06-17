import type { Request, Response } from 'express';
import { ChatRoomService } from '../services/ChatRoomService.js';
import { MessageService } from '../services/MessageService.js';
import { ChatRoomType, ChatRoomStatus } from '../models/ChatRoom.js';
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
    try {
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
    } catch (error) {
      console.error('Create chat room error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get user's chat rooms
  getUserChatRooms = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
      console.error('Get user chat rooms error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get agent's assigned chat rooms
  getAgentChatRooms = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
      console.error('Get agent chat rooms error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get chat room by ID
  getChatRoom = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
      console.error('Get chat room error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get messages for a chat room
  getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
      console.error('Get messages error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Assign agent to chat room
  assignAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = (req as any).user?.role;
      const { chatRoomId, agentId, reason } = req.body;

      // Only agents/admins can assign agents
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
    } catch (error) {
      console.error('Assign agent error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Transfer chat to another agent
  transferChat = async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
      console.error('Transfer chat error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Close chat room
  closeChatRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { chatRoomId } = req.params;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Only agents/admins can close chat rooms
      if (!this.authService.hasPermission(userRole, UserRole.AGENT)) {
        throw new ApiError(403, 'Agent access required');
      }

      const success = await this.chatRoomService.closeChatRoom(chatRoomId, userId);

      const response = new ApiResponse(200, success ? 'Chat room closed successfully' : 'Failed to close chat room');
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Close chat room error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get unread message count
  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const { chatRoomId } = req.query;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      if (chatRoomId) {
        // Get count for specific room
        const unreadCount = await this.messageService.getUnreadCount(
          userId,
          chatRoomId as string
        );
        const response = new ApiResponse(200, 'Unread count fetched', { count: unreadCount });
        res.status(200).json(response.toJSON());
      } else {
        // Get counts for all rooms
        const unreadCounts = await this.messageService.getUnreadCountsPerRoom(userId);
        const totalCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        
        const response = new ApiResponse(200, 'Unread counts fetched', {
          total: totalCount,
          perRoom: unreadCounts
        });
        res.status(200).json(response.toJSON());
      }
    } catch (error) {
      console.error('Get unread count error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Search messages
  searchMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const { chatRoomId } = req.params;
      const { q: searchTerm, limit = 20 } = req.query;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      if (!searchTerm) {
        throw new ApiError(400, 'Search term is required');
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

      const messages = await this.messageService.searchMessages(
        chatRoomId,
        searchTerm as string,
        parseInt(limit as string)
      );

      const response = new ApiResponse(200, 'Messages fetched', messages);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Search messages error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get chat room statistics (admin only)
  getChatRoomStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = (req as any).user?.role;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      const stats = await this.chatRoomService.getChatRoomStats();

      const response = new ApiResponse(200, 'Chat room stats fetched', stats);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get chat room stats error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get online users and agents
  getOnlineUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Get online users from cache/database
      const onlineUsers = await this.authService.getActiveSessions()
        .map(session => ({
          userId: session.userId,
          username: session.username,
          role: session.role,
          status: session.status,
          socketId: session.sessionId // Using sessionId as socketId for now
        }));

      const response = new ApiResponse(200, 'Online users fetched', onlineUsers);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get online users error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get online agents
  getOnlineAgents = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const onlineAgents = await this.authService.getOnlineAgents();

      const response = new ApiResponse(200, 'Online agents fetched', onlineAgents);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get online agents error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Admin: Transfer agent between chats
  transferAgentBetweenChats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { fromChatId, toChatId, agentId, reason } = req.body;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Only admins can transfer agents between chats
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

      const response = new ApiResponse(200, success ? 'Agent transferred successfully' : 'Failed to transfer agent');
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Transfer agent between chats error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Admin: Remove agent from chat
  removeAgentFromChat = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { chatRoomId } = req.params;
      const { reason } = req.body;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Only admins can remove agents from chats
      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      const success = await this.chatRoomService.removeAgentFromChat(chatRoomId, userId, reason);

      const response = new ApiResponse(200, success ? 'Agent removed successfully' : 'Failed to remove agent');
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Remove agent from chat error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Admin: Get agent workload statistics
  getAgentWorkloadStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = (req as any).user?.role;

      // Only admins can view agent workload stats
      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      const stats = await this.chatRoomService.getAgentWorkloadStats();

      const response = new ApiResponse(200, 'Agent workload stats fetched', stats);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get agent workload stats error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };
} 