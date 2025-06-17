import { Request, Response } from 'express';
import { SupportTicketService } from '../services/SupportTicketService.js';
import { TicketStatus, TicketPriority } from '../models/SupportTicket.js';
import { Department, ProblemType, UserRole } from '../types/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class SupportTicketController {

  // Create a new support ticket (user endpoint)
  static async createTicket(req: Request, res: Response) {
    try {
      const { title, description, department, problemType, priority, metadata } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      // Validate required fields
      if (!title || !description || !department || !problemType) {
        throw new ApiError(400, 'Title, description, department, and problem type are required');
      }

      const ticket = await SupportTicketService.createTicket({
        title,
        description,
        department,
        problemType,
        priority: priority || TicketPriority.MEDIUM,
        createdBy: userId,
        metadata
      });

      const response = new ApiResponse(201, 'Support ticket created successfully', ticket);
      res.status(201).json(response.toJSON());
    } catch (error) {
      console.error('Create ticket error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }

  // Assign ticket to agent (admin only)
  static async assignTicket(req: Request, res: Response) {
    try {
      const { ticketId, agentId } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new ApiError(401, 'Authentication required');
      }

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ApiError(403, 'Only administrators can assign tickets');
      }

      if (!ticketId || !agentId) {
        throw new ApiError(400, 'Ticket ID and agent ID are required');
      }

      const result = await SupportTicketService.assignTicket({
        ticketId,
        agentId,
        assignedBy: adminId
      });

      const response = new ApiResponse(200, 'Ticket assigned successfully', result);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Assign ticket error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }

  // Get tickets for admin dashboard
  static async getTicketsForAdmin(req: Request, res: Response) {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new ApiError(403, 'Only administrators can view all tickets');
      }

      const { status, department, priority, assignedAgent } = req.query;

      const filters: any = {};
      if (status) filters.status = status as TicketStatus;
      if (department) filters.department = department as Department;
      if (priority) filters.priority = priority as TicketPriority;
      if (assignedAgent) filters.assignedAgent = assignedAgent as string;

      const tickets = await SupportTicketService.getTicketsForAdmin(filters);

      const response = new ApiResponse(200, 'Tickets retrieved successfully', tickets);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get admin tickets error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }

  // Get tickets for current user
  static async getMyTickets(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const tickets = await SupportTicketService.getTicketsForUser(userId);

      const response = new ApiResponse(200, 'Your tickets retrieved successfully', tickets);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get user tickets error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }

  // Get tickets assigned to agent
  static async getAgentTickets(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      if (req.user?.role !== UserRole.AGENT) {
        throw new ApiError(403, 'Only agents can view assigned tickets');
      }

      const tickets = await SupportTicketService.getTicketsForAgent(userId);

      const response = new ApiResponse(200, 'Assigned tickets retrieved successfully', tickets);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get agent tickets error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }

  // Update ticket status
  static async updateTicketStatus(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      if (!status || !Object.values(TicketStatus).includes(status)) {
        throw new ApiError(400, 'Valid status is required');
      }

      // Only admin or assigned agent can update status
      if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.AGENT) {
        throw new ApiError(403, 'Only administrators and agents can update ticket status');
      }

      const ticket = await SupportTicketService.updateTicketStatus({
        ticketId,
        status,
        updatedBy: userId
      });

      const response = new ApiResponse(200, 'Ticket status updated successfully', ticket);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Update ticket status error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }

  // Get ticket by ID
  static async getTicketById(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const ticket = await SupportTicketService.getTicketById(ticketId);

      if (!ticket) {
        throw new ApiError(404, 'Ticket not found');
      }

      // Check permissions - user can only see their own tickets, agents can see assigned tickets, admin can see all
      const canView = 
        req.user?.role === UserRole.ADMIN ||
        (ticket.createdBy as any)._id.toString() === userId ||
        (ticket.assignedAgent && (ticket.assignedAgent as any)._id.toString() === userId);

      if (!canView) {
        throw new ApiError(403, 'You do not have permission to view this ticket');
      }

      const response = new ApiResponse(200, 'Ticket retrieved successfully', ticket);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get ticket by ID error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }

  // Get ticket statistics (admin only)
  static async getTicketStats(req: Request, res: Response) {
    try {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new ApiError(403, 'Only administrators can view ticket statistics');
      }

      const stats = await SupportTicketService.getTicketStats();

      const response = new ApiResponse(200, 'Ticket statistics retrieved successfully', stats);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get ticket stats error:', error);
      if (error instanceof ApiError) {
        const response = new ApiResponse(error.statusCode, error.message, null);
        res.status(error.statusCode).json(response.toJSON());
      } else {
        const response = new ApiResponse(500, 'Internal server error', null);
        res.status(500).json(response.toJSON());
      }
    }
  }
} 