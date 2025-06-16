import { ChatRoom, ChatRoomType, ChatRoomStatus } from '../models/ChatRoom.js';
import type { IChatRoom } from '../models/ChatRoom.js';
import { User, UserRole } from '../models/User.js';
import { CacheService } from './CacheService.js';
import { AuthService } from './AuthService.js';
import mongoose from 'mongoose';

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

export class ChatRoomService {
  private static instance: ChatRoomService;
  private cacheService: CacheService;
  private authService: AuthService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.authService = AuthService.getInstance();
  }

  static getInstance(): ChatRoomService {
    if (!ChatRoomService.instance) {
      ChatRoomService.instance = new ChatRoomService();
    }
    return ChatRoomService.instance;
  }

  // Create a new chat room
  async createChatRoom(data: CreateChatRoomData): Promise<IChatRoom | null> {
    try {
      // Validate participants exist
      const participantIds = data.participants.map(id => new mongoose.Types.ObjectId(id));
      const participants = await User.find({ _id: { $in: participantIds } });
      
      if (participants.length !== data.participants.length) {
        throw new Error('Some participants not found');
      }

      // For support chats, auto-assign an available agent if not specified
      let assignedAgent = data.assignedAgent;
      if (data.type === ChatRoomType.SUPPORT && !assignedAgent) {
        assignedAgent = await this.findAvailableAgent() || undefined;
      }

      const chatRoom = new ChatRoom({
        name: data.name,
        type: data.type,
        status: ChatRoomStatus.ACTIVE,
        participants: participantIds,
        assignedAgent: assignedAgent ? new mongoose.Types.ObjectId(assignedAgent) : undefined,
        createdBy: new mongoose.Types.ObjectId(data.createdBy),
        metadata: data.metadata,
        lastActivity: new Date()
      });

      await chatRoom.save();

      // Update agent's assigned chats if agent is assigned
      if (assignedAgent) {
        await User.findByIdAndUpdate(assignedAgent, {
          $addToSet: { assignedChats: chatRoom._id }
        });
      }

      // Cache the chat room
      await this.cacheService.cacheChatRoom(chatRoom);

      // Populate before returning
      await chatRoom.populate([
        { path: 'participants', select: 'username email role status isOnline' },
        { path: 'assignedAgent', select: 'username email role status isOnline' },
        { path: 'createdBy', select: 'username email role' }
      ]);

      return chatRoom;
    } catch (error) {
      console.error('Create chat room error:', error);
      return null;
    }
  }

  // Get chat rooms for a user
  async getUserChatRooms(userId: string, type?: ChatRoomType): Promise<IChatRoom[]> {
    try {
      // Try cache first
      const cachedChats = await this.cacheService.getUserCachedChats(userId);
      
      const query: any = {
        participants: new mongoose.Types.ObjectId(userId),
        isActive: true
      };

      if (type) {
        query.type = type;
      }

      const chatRooms = await ChatRoom.find(query)
        .populate([
          { path: 'participants', select: 'username email role status isOnline' },
          { path: 'assignedAgent', select: 'username email role status isOnline' },
          { path: 'lastMessage', select: 'content messageType createdAt senderId' }
        ])
        .sort({ lastActivity: -1 });
        
      // Cache the result
      const chatRoomIds = chatRooms.map(room => (room._id as any).toString());
      await this.cacheService.cacheUserChats(userId, chatRoomIds);

      return chatRooms;
    } catch (error) {
      console.error('Get user chat rooms error:', error);
      return [];
    }
  }

  // Get chat rooms assigned to an agent
  async getAgentChatRooms(agentId: string, status?: ChatRoomStatus): Promise<IChatRoom[]> {
    try {
      const query: any = {
        assignedAgent: new mongoose.Types.ObjectId(agentId),
        isActive: true
      };

      if (status) {
        query.status = status;
      }

      return await ChatRoom.find(query)
        .populate([
          { path: 'participants', select: 'username email role status isOnline' },
          { path: 'lastMessage', select: 'content messageType createdAt senderId' }
        ])
        .sort({ lastActivity: -1 });
    } catch (error) {
      console.error('Get agent chat rooms error:', error);
      return [];
    }
  }

  // Assign an agent to a chat room
  async assignAgent(assignment: AgentAssignment): Promise<boolean> {
    try {
      const { chatRoomId, agentId, reason } = assignment;

      // Validate agent exists and has agent role
      const agent = await User.findById(agentId);
      if (!agent || !this.authService.hasPermission(agent.role, UserRole.AGENT)) {
        return false;
      }

      // Get current chat room
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        return false;
      }

      const previousAgent = chatRoom.assignedAgent;

      // Update chat room
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        assignedAgent: new mongoose.Types.ObjectId(agentId),
        status: ChatRoomStatus.ACTIVE,
        $push: previousAgent ? {
          transferHistory: {
            fromAgent: previousAgent,
            toAgent: new mongoose.Types.ObjectId(agentId),
            transferredAt: new Date(),
            reason
          }
        } : undefined
      });

      // Update agent's assigned chats
      await User.findByIdAndUpdate(agentId, {
        $addToSet: { assignedChats: chatRoomId }
      });

      // Remove from previous agent if any
      if (previousAgent) {
        await User.findByIdAndUpdate(previousAgent, {
          $pull: { assignedChats: chatRoomId }
        });
      }

      // Update cache
      const updatedRoom = await ChatRoom.findById(chatRoomId);
      if (updatedRoom) {
        await this.cacheService.cacheChatRoom(updatedRoom);
      }

      return true;
    } catch (error) {
      console.error('Assign agent error:', error);
      return false;
    }
  }

  // Find an available agent for auto-assignment
  async findAvailableAgent(): Promise<string | null> {
    try {
      // Get online agents with least number of active chats
      const agents = await User.aggregate([
        {
          $match: {
            role: { $in: [UserRole.AGENT, UserRole.ADMIN] },
            isOnline: true
          }
        },
        {
          $lookup: {
            from: 'chatrooms',
            localField: '_id',
            foreignField: 'assignedAgent',
            as: 'activeChatRooms',
            pipeline: [
              { $match: { status: ChatRoomStatus.ACTIVE, isActive: true } }
            ]
          }
        },
        {
          $addFields: {
            activeChatCount: { $size: '$activeChatRooms' }
          }
        },
        {
          $sort: { activeChatCount: 1 }
        },
        {
          $limit: 1
        }
      ]);

      return agents.length > 0 ? agents[0]._id.toString() : null;
    } catch (error) {
      console.error('Find available agent error:', error);
      return null;
    }
  }

  // Close a chat room
  async closeChatRoom(chatRoomId: string, closedBy: string): Promise<boolean> {
    try {
      const result = await ChatRoom.findByIdAndUpdate(chatRoomId, {
        status: ChatRoomStatus.CLOSED,
        isActive: false,
        lastActivity: new Date()
      });

      if (result) {
        // Remove from agent's assigned chats
        if (result.assignedAgent) {
          await User.findByIdAndUpdate(result.assignedAgent, {
            $pull: { assignedChats: chatRoomId }
          });
        }

        // Clear from cache
        await this.cacheService.clearChatHistory(chatRoomId);
      }

      return !!result;
    } catch (error) {
      console.error('Close chat room error:', error);
      return false;
    }
  }

  // Transfer chat to another agent
  async transferChat(chatRoomId: string, fromAgentId: string, toAgentId: string, reason?: string): Promise<boolean> {
    try {
      // Validate both agents
      const [fromAgent, toAgent] = await Promise.all([
        User.findById(fromAgentId),
        User.findById(toAgentId)
      ]);

      if (!fromAgent || !toAgent || 
          !this.authService.hasPermission(fromAgent.role, UserRole.AGENT) ||
          !this.authService.hasPermission(toAgent.role, UserRole.AGENT)) {
        return false;
      }

      return await this.assignAgent({
        chatRoomId,
        agentId: toAgentId,
        reason: reason || 'Chat transferred'
      });
    } catch (error) {
      console.error('Transfer chat error:', error);
      return false;
    }
  }

  // Get chat room by ID
  async getChatRoomById(chatRoomId: string): Promise<IChatRoom | null> {
    try {
      // Try cache first
      const cached = await this.cacheService.getCachedChatRoom(chatRoomId);
      if (cached) {
        // Convert cached data back to full object if needed
        // For now, just fetch from database
      }

      return await ChatRoom.findById(chatRoomId)
        .populate([
          { path: 'participants', select: 'username email role status isOnline' },
          { path: 'assignedAgent', select: 'username email role status isOnline' },
          { path: 'createdBy', select: 'username email role' },
          { path: 'lastMessage', select: 'content messageType createdAt senderId' }
        ]);
    } catch (error) {
      console.error('Get chat room by ID error:', error);
      return null;
    }
  }

  // Get chat room statistics
  async getChatRoomStats(): Promise<any> {
    try {
      const stats = await ChatRoom.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const agentStats = await ChatRoom.aggregate([
        {
          $match: { assignedAgent: { $exists: true }, isActive: true }
        },
        {
          $group: {
            _id: '$assignedAgent',
            activeChatCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent'
          }
        },
        {
          $unwind: '$agent'
        },
        {
          $project: {
            agentId: '$_id',
            agentName: '$agent.username',
            activeChatCount: 1
          }
        }
      ]);

      return {
        statusCounts: stats,
        agentWorkload: agentStats
      };
    } catch (error) {
      console.error('Get chat room stats error:', error);
      return null;
    }
  }

  // Add participant to chat room
  async addParticipant(chatRoomId: string, userId: string): Promise<boolean> {
    try {
      const result = await ChatRoom.findByIdAndUpdate(chatRoomId, {
        $addToSet: { participants: new mongoose.Types.ObjectId(userId) },
        lastActivity: new Date()
      });

      if (result) {
        // Update cache
        await this.cacheService.cacheChatRoom(result);
      }

      return !!result;
    } catch (error) {
      console.error('Add participant error:', error);
      return false;
    }
  }

  // Remove participant from chat room
  async removeParticipant(chatRoomId: string, userId: string): Promise<boolean> {
    try {
      const result = await ChatRoom.findByIdAndUpdate(chatRoomId, {
        $pull: { participants: new mongoose.Types.ObjectId(userId) },
        lastActivity: new Date()
      });

      return !!result;
    } catch (error) {
      console.error('Remove participant error:', error);
      return false;
    }
  }
} 