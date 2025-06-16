import type { Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { UserRole } from '../types/index.js';
import type { RegisterRequest } from '../interfaces/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/User.js';
import { ChatRoom } from '../models/ChatRoom.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  // Register new user
  register = async (req: Request, res: Response): Promise<void> => {
    const { username, email, password, role }: RegisterRequest = req.body;

    if (!username || !email || !password) {
      throw new ApiError(400, 'Username, email, and password are required');
    }

    const result = await this.authService.register({
      username,
      email,
      password,
      role: role || UserRole.USER
    });

    if (result.success) {
      const response = new ApiResponse(201, 'User registered successfully', result.user);
      res.status(201).json(response.toJSON());
    } else {
      throw new ApiError(400, result.message || 'Registration failed');
    }
  };

  // Login user
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      const result = await this.authService.login(email, password);


      if (result.success) {
        const response = new ApiResponse(200, 'Login successful', result.user);
        res.status(200).json(response.toJSON());
      } else {
        throw new ApiError(401, result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Logout user
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
        return;
      }

      const success = await this.authService.logout(sessionId);

      const response = new ApiResponse(200, success ? 'Logged out successfully' : 'Failed to logout');
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Logout error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Validate session
  validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
        return;
      }

      const session = await this.authService.validateSession(sessionId);

      if (session) {
        const response = new ApiResponse(200, 'Session validated', session);
        res.status(200).json(response.toJSON());
      } else {
        throw new ApiError(401, 'Invalid session');
      }
    } catch (error) {
      console.error('Validate session error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get current user profile
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const user = await this.authService.getUserById(userId);

      if (user) {
        const response = new ApiResponse(200, 'User profile fetched', user);
        res.status(200).json(response.toJSON());
      } else {
        throw new ApiError(404, 'User not found');
      }
    } catch (error) {
      console.error('Get profile error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Update user status
  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const { status } = req.body;

      if (!userId) {
        throw new ApiError(401, 'Authentication required');
      }

      const success = await this.authService.updateUserStatus(userId, status);

      const response = new ApiResponse(200, success ? 'Status updated successfully' : 'Failed to update status');
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Update status error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get online agents (for users/admins)
  getOnlineAgents = async (req: Request, res: Response): Promise<void> => {
    try {
      const agents = await this.authService.getOnlineAgents();

      const response = new ApiResponse(200, 'Online agents fetched', agents);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get online agents error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get all agents (admin only)
  getAllAgents = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = (req as any).user?.role;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      const agents = await this.authService.getAllAgents();

      const response = new ApiResponse(200, 'All agents fetched', agents);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get all agents error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get admin statistics (admin only)
  getAdminStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = (req as any).user?.role;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      // Get total users
      const totalUsers = await User.countDocuments();

      // Get active agents (online agents)
      const activeAgents = await User.countDocuments({
        role: UserRole.AGENT,
        status: 'online'
      });

      // Get active chat rooms
      const activeChats = await ChatRoom.countDocuments({
        status: 'ACTIVE'
      });

      // Get online users (all roles)
      const onlineUsers = await User.countDocuments({
        status: 'online'
      });

      const stats = {
        totalUsers,
        activeAgents,
        activeChats,
        onlineUsers
      };

      const response = new ApiResponse(200, 'Admin stats fetched', stats);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get admin stats error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Get all users (admin only)
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = (req as any).user?.role;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      const users = await User.find({}, '-password -__v')
        .sort({ createdAt: -1 })
        .lean();

      const response = new ApiResponse(200, 'All users fetched', users);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Get all users error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };

  // Update user status (admin only)
  updateUserStatusAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRole = (req as any).user?.role;
      const { userId } = req.params;
      const { status } = req.body;

      if (!this.authService.hasPermission(userRole, UserRole.ADMIN)) {
        throw new ApiError(403, 'Admin access required');
      }

      if (!userId || !status) {
        throw new ApiError(400, 'User ID and status are required');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { status },
        { new: true, select: '-password -__v' }
      );

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const response = new ApiResponse(200, 'User status updated successfully', user);
      res.status(200).json(response.toJSON());
    } catch (error) {
      console.error('Update user status error:', error);
      throw new ApiError(500, 'Internal server error');
    }
  };
} 