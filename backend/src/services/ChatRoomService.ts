import { ChatRoom, ChatRoomType, ChatRoomStatus } from '../models/ChatRoom.js';
import type { IChatRoom } from '../models/ChatRoom.js';
import { User, UserRole } from '../models/User.js';
import { CacheService } from './CacheService.js';
import { AuthService } from './AuthService.js';
import { MessageService } from './MessageService.js';
import { MessageType } from '../models/Message.js';
import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError.js';

export interface CreateChatRoomData {
  type: ChatRoomType;
  createdBy: string;
  participants: string[];
  name?: string;
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
    console.log(`🏗️ ChatRoomService: Creating chat room with data:`, data);

    // Validate participants exist
    const participantIds = data.participants.map(id => new mongoose.Types.ObjectId(id));
    const participants = await User.find({ _id: { $in: participantIds } });
    
    if (participants.length !== data.participants.length) {
      console.error(`❌ ChatRoomService: Some participants not found. Expected: ${data.participants.length}, Found: ${participants.length}`);
      throw new ApiError(400, 'Some participants not found');
    }

    console.log(`👥 ChatRoomService: Validated participants:`, participants.map(p => ({ id: p._id, username: p.username })));

    // For support chats, auto-assign an available agent if not specified
    let assignedAgent = data.assignedAgent;
    if (data.type === ChatRoomType.SUPPORT && !assignedAgent) {
      console.log(`🔍 ChatRoomService: Finding available agent for support chat`);
      assignedAgent = await this.findAvailableAgent() || undefined;
      
      if (assignedAgent) {
        console.log(`✅ ChatRoomService: Found available agent: ${assignedAgent}`);
        // Add assigned agent to participants if not already included
        if (!data.participants.includes(assignedAgent)) {
          participantIds.push(new mongoose.Types.ObjectId(assignedAgent));
          console.log(`➕ ChatRoomService: Added agent to participants. New count: ${participantIds.length}`);
        }
      } else {
        console.warn(`⚠️ ChatRoomService: No available agent found for support chat`);
      }
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

    // Automatically send the subject as the first message for support chats
    if (data.type === ChatRoomType.SUPPORT && data.metadata?.subject) {
      try {
        const messageService = MessageService.getInstance();
        const welcomeMessage = `Hello! I need help with: **${data.metadata.subject}**`;
        
        await messageService.createMessage({
          chatRoomId: (chatRoom._id as mongoose.Types.ObjectId).toString(),
          senderId: data.createdBy,
          content: welcomeMessage,
          messageType: MessageType.TEXT,
          metadata: {
            isChatInitial: true,
            subject: data.metadata.subject
          }
        });

        console.log(`📧 ChatRoomService: Initial message sent to chat room ${chatRoom._id} for subject: ${data.metadata.subject}`);
      } catch (error) {
        console.error('Error sending initial chat message:', error);
        // Don't fail the entire operation if message sending fails
      }
    }

    return chatRoom;
  }

  // Get chat rooms for a user
  async getUserChatRooms(userId: string, type?: ChatRoomType): Promise<IChatRoom[]> {
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
  }

  // Get chat rooms assigned to an agent
  async getAgentChatRooms(agentId: string, status?: ChatRoomStatus): Promise<IChatRoom[]> {
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
  }

  // Get chat room by ID
  async getChatRoomById(chatRoomId: string): Promise<IChatRoom | null> {
    if (!mongoose.Types.ObjectId.isValid(chatRoomId)) {
      throw new ApiError(400, 'Invalid chat room ID format');
    }

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
  }

  // Find available agent based on workload
  async findAvailableAgent(): Promise<string | null> {
    console.log(`🔍 Finding available agent`);
    
    // Build query for agents
    const agentQuery: any = {
      role: { $in: [UserRole.AGENT, UserRole.ADMIN] },
      isOnline: true
    };

    // Get available agents
    const availableAgents = await User.find(agentQuery).lean();
    console.log(`📋 Found ${availableAgents.length} available agents`);

    if (availableAgents.length === 0) {
      console.log('❌ No agents available');
      return null;
    }

    // Calculate workload for each agent (number of active chats)
    const agentsWithWorkload = await Promise.all(
      availableAgents.map(async (agent) => {
        const activeChats = await ChatRoom.countDocuments({
          assignedAgent: agent._id,
          status: { $in: [ChatRoomStatus.ACTIVE, ChatRoomStatus.PENDING] }
        });
        
        return {
          ...agent,
          workload: activeChats
        };
      })
    );

    // Sort by workload (ascending)
    agentsWithWorkload.sort((a, b) => a.workload - b.workload);

    const selectedAgent = agentsWithWorkload[0];
    console.log(`✅ Selected agent: ${selectedAgent.username} (workload: ${selectedAgent.workload})`);
    
    return selectedAgent._id.toString();
  }

  // Assign an agent to a chat room
  async assignAgent(assignment: AgentAssignment): Promise<boolean> {
    const { chatRoomId, agentId, reason } = assignment;

    if (!mongoose.Types.ObjectId.isValid(chatRoomId)) {
      throw new ApiError(400, 'Invalid chat room ID format');
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new ApiError(400, 'Invalid agent ID format');
    }

    // Validate agent exists and has agent role
    const agent = await User.findById(agentId);
    if (!agent || !this.authService.hasPermission(agent.role, UserRole.AGENT)) {
      throw new ApiError(400, 'Invalid agent or insufficient permissions');
    }

    // Get current chat room
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      throw new ApiError(404, 'Chat room not found');
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

  // Admin: Transfer agent from one chat to another
  async transferAgentBetweenChats(fromChatId: string, toChatId: string, agentId: string, adminId: string, reason?: string): Promise<boolean> {
    try {
      // Verify both chat rooms exist
      const [fromChat, toChat] = await Promise.all([
        ChatRoom.findById(fromChatId),
        ChatRoom.findById(toChatId)
      ]);

      if (!fromChat || !toChat) {
        throw new Error('One or both chat rooms not found');
      }

      // Verify agent exists and is assigned to fromChat
      const agent = await User.findById(agentId);
      if (!agent || fromChat.assignedAgent?.toString() !== agentId) {
        throw new Error('Agent not found or not assigned to source chat');
      }

      // Remove agent from fromChat and auto-assign a new one
      await this.removeAgentFromChat(fromChatId, adminId, `Transferred to chat ${toChatId}: ${reason || 'Admin decision'}`);

      // Assign agent to toChat
      await this.assignAgent({
        chatRoomId: toChatId,
        agentId: agentId,
        reason: `Transferred from chat ${fromChatId}: ${reason || 'Admin decision'}`
      });

      console.log(`✅ Agent ${agent.username} transferred from chat ${fromChatId} to ${toChatId}`);
      return true;
    } catch (error) {
      console.error('Transfer agent between chats error:', error);
      return false;
    }
  }

  // Admin: Remove agent from chat and auto-assign new one
  async removeAgentFromChat(chatRoomId: string, adminId: string, reason?: string): Promise<boolean> {
    try {
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        throw new Error('Chat room not found');
      }

      const previousAgentId = chatRoom.assignedAgent?.toString();
      
      if (!previousAgentId) {
        throw new Error('No agent assigned to this chat');
      }

      // Find a new agent for this chat
      const newAgentId = await this.findAvailableAgent();

      // Update chat room with new agent
      const updateData: any = {
        $push: {
          transferHistory: {
            fromAgent: new mongoose.Types.ObjectId(previousAgentId),
            toAgent: newAgentId ? new mongoose.Types.ObjectId(newAgentId) : null,
            transferredAt: new Date(),
            reason: reason || 'Admin removal'
          }
        }
      };

      if (newAgentId) {
        updateData.assignedAgent = new mongoose.Types.ObjectId(newAgentId);
        updateData.status = ChatRoomStatus.ACTIVE;
      } else {
        updateData.assignedAgent = null;
        updateData.status = ChatRoomStatus.PENDING;
      }

      await ChatRoom.findByIdAndUpdate(chatRoomId, updateData);

      // Update agent assignments
      await User.findByIdAndUpdate(previousAgentId, {
        $pull: { assignedChats: chatRoomId }
      });

      if (newAgentId) {
        await User.findByIdAndUpdate(newAgentId, {
          $addToSet: { assignedChats: chatRoomId }
        });
      }

      console.log(`✅ Agent removed from chat ${chatRoomId}, new agent: ${newAgentId || 'none available'}`);
      return true;
    } catch (error) {
      console.error('Remove agent from chat error:', error);
      return false;
    }
  }

  // Admin: Get agent workload statistics
  async getAgentWorkloadStats(): Promise<any[]> {
    try {
      const stats = await User.aggregate([
        {
          $match: {
            role: { $in: [UserRole.AGENT, UserRole.ADMIN] }
          }
        },
        {
          $lookup: {
            from: 'chatrooms',
            localField: '_id',
            foreignField: 'assignedAgent',
            as: 'assignedChats',
            pipeline: [
              {
                $match: {
                  status: { $in: [ChatRoomStatus.ACTIVE, ChatRoomStatus.PENDING] },
                  isActive: true
                }
              }
            ]
          }
        },
        {
          $addFields: {
            activeChatsCount: { $size: '$assignedChats' },
            workloadPercentage: {
              $multiply: [
                { $divide: [{ $size: '$assignedChats' }, 10] }, // Assuming max 10 chats per agent
                100
              ]
            }
          }
        },
        {
          $project: {
            username: 1,
            email: 1,
            department: 1,
            specialization: 1,
            isOnline: 1,
            status: 1,
            activeChatsCount: 1,
            workloadPercentage: 1,
            assignedChats: {
              $map: {
                input: '$assignedChats',
                as: 'chat',
                in: {
                  _id: '$$chat._id',
                  type: '$$chat.type',
                  status: '$$chat.status',
                  lastActivity: '$$chat.lastActivity',
                  metadata: '$$chat.metadata'
                }
              }
            }
          }
        },
        {
          $sort: { activeChatsCount: -1 }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Get agent workload stats error:', error);
      return [];
    }
  }
} 