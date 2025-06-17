import { SupportTicket, ISupportTicket, TicketStatus, TicketPriority } from '../models/SupportTicket.js';
import { User } from '../models/User.js';
import { Department, ProblemType, UserRole } from '../types/index.js';
import { ApiError } from '../utils/apiError.js';
import { ChatRoomService } from './ChatRoomService.js';
import { MessageService } from './MessageService.js';
import { ChatRoomType } from '../models/ChatRoom.js';
import { MessageType } from '../models/Message.js';
import mongoose from 'mongoose';

export class SupportTicketService {
  
  // Create a new support ticket (user-initiated)
  static async createTicket(data: {
    title: string;
    description: string;
    department: Department;
    problemType: ProblemType;
    priority?: TicketPriority;
    createdBy: string;
    metadata?: any;
  }): Promise<ISupportTicket> {
    console.log(`📝 SupportTicketService: Creating ticket for user ${data.createdBy}`);

    const ticket = new SupportTicket({
      title: data.title,
      description: data.description,
      department: data.department,
      problemType: data.problemType,
      priority: data.priority || TicketPriority.MEDIUM,
      createdBy: data.createdBy,
      metadata: data.metadata,
      status: TicketStatus.PENDING
    });

    await ticket.save();
    console.log(`✅ SupportTicketService: Ticket ${ticket.ticketNumber} created successfully`);
    
    return ticket.populate(['createdBy']);
  }

  // Admin assigns agent to ticket and creates chat room
  static async assignTicket(data: {
    ticketId: string;
    agentId: string;
    assignedBy: string; // Admin who made the assignment
  }): Promise<{ ticket: ISupportTicket; chatRoom: any }> {
    console.log(`👥 SupportTicketService: Assigning ticket ${data.ticketId} to agent ${data.agentId}`);

    // Verify admin permissions
    const admin = await User.findById(data.assignedBy);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ApiError(403, 'Only administrators can assign tickets');
    }

    // Verify agent exists and is an agent
    const agent = await User.findById(data.agentId);
    if (!agent || agent.role !== UserRole.AGENT) {
      throw new ApiError(400, 'Invalid agent ID');
    }

    // Get the ticket
    const ticket = await SupportTicket.findById(data.ticketId).populate('createdBy');
    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    if (ticket.status !== TicketStatus.PENDING) {
      throw new ApiError(400, 'Can only assign pending tickets');
    }

    // Create a chat room for this ticket
    const chatRoomData = {
      type: ChatRoomType.SUPPORT,
      name: `Support: ${ticket.title}`,
      participants: [ticket.createdBy.toString()], // User who created the ticket
      assignedAgent: data.agentId,
      createdBy: data.assignedBy, // Admin creates the room
      metadata: {
        subject: ticket.title,
        department: ticket.department,
        problemType: ticket.problemType,
        ticketId: (ticket._id as mongoose.Types.ObjectId).toString(),
        ticketNumber: ticket.ticketNumber,
        isSupport: true
      }
    };

    const chatRoomService = ChatRoomService.getInstance();
    const chatRoom = await chatRoomService.createChatRoom(chatRoomData);

    if (!chatRoom) {
      throw new ApiError(500, 'Failed to create chat room');
    }

    // Update the ticket
    ticket.assignedAgent = new mongoose.Types.ObjectId(data.agentId);
    ticket.assignedBy = new mongoose.Types.ObjectId(data.assignedBy);
    ticket.chatRoom = chatRoom._id as mongoose.Types.ObjectId;
    ticket.status = TicketStatus.ASSIGNED;
    ticket.assignedAt = new Date();

    await ticket.save();

    // Automatically send the ticket description as the first message
    try {
      const messageService = MessageService.getInstance();
      const welcomeMessage = `**Support Ticket #${ticket.ticketNumber}**\n\n**Issue:** ${ticket.title}\n\n**Description:**\n${ticket.description}`;
      
      await messageService.createMessage({
        chatRoomId: (chatRoom._id as mongoose.Types.ObjectId).toString(),
        senderId: ticket.createdBy.toString(),
        content: welcomeMessage,
        messageType: MessageType.TEXT,
        metadata: {
          isTicketInitial: true,
          ticketId: (ticket._id as mongoose.Types.ObjectId).toString(),
          ticketNumber: ticket.ticketNumber
        }
      });

      console.log(`📧 SupportTicketService: Initial message sent to chat room ${chatRoom._id} for ticket ${ticket.ticketNumber}`);
    } catch (error) {
      console.error('Error sending initial ticket message:', error);
      // Don't fail the entire operation if message sending fails
    }

    console.log(`✅ SupportTicketService: Ticket ${ticket.ticketNumber} assigned to ${agent.username} with chat room ${chatRoom._id}`);

    return { 
      ticket: await ticket.populate(['createdBy', 'assignedAgent', 'assignedBy']), 
      chatRoom 
    };
  }

  // Get tickets for admin dashboard
  static async getTicketsForAdmin(filters?: {
    status?: TicketStatus;
    department?: Department;
    priority?: TicketPriority;
    assignedAgent?: string;
  }) {
    console.log('📋 SupportTicketService: Getting tickets for admin dashboard');

    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.department) query.department = filters.department;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assignedAgent) query.assignedAgent = filters.assignedAgent;

    const tickets = await SupportTicket.find(query)
      .populate('createdBy', 'username email')
      .populate('assignedAgent', 'username email department')
      .populate('assignedBy', 'username email')
      .sort({ priority: -1, createdAt: -1 });

    return tickets;
  }

  // Get tickets for a specific user
  static async getTicketsForUser(userId: string) {
    console.log(`📋 SupportTicketService: Getting tickets for user ${userId}`);

    const tickets = await SupportTicket.find({ createdBy: userId })
      .populate('assignedAgent', 'username email department')
      .populate('chatRoom')
      .sort({ createdAt: -1 });

    return tickets;
  }

  // Get tickets assigned to a specific agent
  static async getTicketsForAgent(agentId: string) {
    console.log(`📋 SupportTicketService: Getting tickets for agent ${agentId}`);

    const tickets = await SupportTicket.find({ 
      assignedAgent: agentId,
      status: { $in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] }
    })
      .populate('createdBy', 'username email')
      .populate('chatRoom')
      .sort({ priority: -1, assignedAt: -1 });

    return tickets;
  }

  // Update ticket status
  static async updateTicketStatus(data: {
    ticketId: string;
    status: TicketStatus;
    updatedBy: string;
  }): Promise<ISupportTicket> {
    console.log(`🔄 SupportTicketService: Updating ticket ${data.ticketId} status to ${data.status}`);

    const ticket = await SupportTicket.findById(data.ticketId);
    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    const previousStatus = ticket.status;
    ticket.status = data.status;

    if (data.status === TicketStatus.RESOLVED || data.status === TicketStatus.CLOSED) {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    console.log(`✅ SupportTicketService: Ticket ${ticket.ticketNumber} status updated from ${previousStatus} to ${data.status}`);

    return ticket.populate(['createdBy', 'assignedAgent', 'assignedBy']);
  }

  // Get ticket by ID with full details
  static async getTicketById(ticketId: string): Promise<ISupportTicket | null> {
    return SupportTicket.findById(ticketId)
      .populate('createdBy', 'username email')
      .populate('assignedAgent', 'username email department')
      .populate('assignedBy', 'username email')
      .populate('chatRoom');
  }

  // Get pending tickets count
  static async getPendingTicketsCount(): Promise<number> {
    return SupportTicket.countDocuments({ status: TicketStatus.PENDING });
  }

  // Get ticket statistics
  static async getTicketStats() {
    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', TicketStatus.PENDING] }, 1, 0] }
          }
        }
      }
    ]);

    return { stats, departmentStats };
  }
} 