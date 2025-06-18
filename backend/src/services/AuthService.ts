import bcrypt from 'bcrypt';
import type { IUser } from '../interfaces/index.js';
import { User } from '../models/User.js';
import { UserRole, UserStatus, Department } from '../types/index.js';
import type { AuthSession, LoginResult, RegisterResult } from '../interfaces/index.js';
import { CacheService } from './CacheService.js';
import { ApiError } from '../utils/apiError.js';
import mongoose from 'mongoose';

export class AuthService {
  private static instance: AuthService;
  private cacheService: CacheService;
  private activeSessions: Map<string, AuthSession> = new Map();

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // User registration
  async register(userData: {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
    department?: Department;
    specialization?: string;
  }): Promise<RegisterResult> {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email or username already exists'
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create new user
      const newUser = new User({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || UserRole.USER,
        department: userData.department || (userData.role === UserRole.AGENT ? Department.GENERAL_SUPPORT : Department.UNKNOWN),
        specialization: userData.specialization || '',
        status: UserStatus.OFFLINE
      });

      await newUser.save();

      // Remove password from response
      const userResponse = newUser.toObject();
      delete (userResponse as any).password;

      return {
        success: true,
        user: userResponse,
        message: 'User registered successfully'
      };
  }

  // User login
  async login(email: string, password: string): Promise<LoginResult> {
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate session
      const sessionId = this.generateSessionId();
      const authSession: AuthSession = {
        userId: (user._id as any).toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        sessionId,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      // Store session
      this.activeSessions.set(sessionId, authSession);

      // Update user status
      await User.findByIdAndUpdate(user._id, {
        status: UserStatus.ONLINE,
        isOnline: true,
        lastSeen: new Date()
      });

      return {
        success: true,
        user: authSession,
        message: 'Login successful'
      };
  }

  // Session validation
  async validateSession(sessionId: string): Promise<AuthSession | null> {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return null;
      }

      // Check if session is expired (24 hours)
      const sessionAge = Date.now() - session.createdAt.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (sessionAge > maxAge) {
        this.activeSessions.delete(sessionId);
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      this.activeSessions.set(sessionId, session);

      return session;
  }

  // Logout
  async logout(sessionId: string): Promise<boolean> {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        // Update user status
        await User.findByIdAndUpdate(session.userId, {
          status: UserStatus.OFFLINE,
          isOnline: false,
          lastSeen: new Date(),
          socketId: undefined
        });

        // Clear from cache
        await this.cacheService.setUserOffline(session.userId);

        // Remove session
        this.activeSessions.delete(sessionId);
      }

      return true;
  }

  // Generate session ID
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Get user by ID
  async getUserById(userId: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID format');
    }

      return await User.findById(userId).select('-password');
  }

  // Update user status
  async updateUserStatus(userId: string, status: UserStatus, socketId?: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID format');
    }

      const updateData: any = {
        status,
        isOnline: status !== UserStatus.OFFLINE,
        lastSeen: new Date()
      };

      if (socketId) {
        updateData.socketId = socketId;
      }

      await User.findByIdAndUpdate(userId, updateData);

      // Update cache
      if (status === UserStatus.OFFLINE) {
        await this.cacheService.setUserOffline(userId);
      } else if (socketId) {
        await this.cacheService.setUserOnline(userId, socketId);
      }

      return true;
  }

  // Get online agents
  async getOnlineAgents(): Promise<IUser[]> {
      // Get agents who are marked as online AND have active sessions
      const activeSessionUserIds = Array.from(this.activeSessions.values()).map(session => session.userId);
      
      return await User.find({
        _id: { $in: activeSessionUserIds },
        role: { $in: [UserRole.AGENT, UserRole.ADMIN] },
        isOnline: true
      }).select('-password');
  }

  // Get all agents
  async getAllAgents(): Promise<IUser[]> {
      return await User.find({
        role: { $in: [UserRole.AGENT, UserRole.ADMIN] }
      }).select('-password');
  }

  // Permission check
  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.USER]: 1,
      [UserRole.AGENT]: 2,
      [UserRole.ADMIN]: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  // Resource access check
  canAccessResource(userRole: UserRole, resourceType: string): boolean {
    // Define resource access rules
    const accessRules: { [key: string]: UserRole[] } = {
      'chat': [UserRole.USER, UserRole.AGENT, UserRole.ADMIN],
      'admin': [UserRole.ADMIN],
      'agent': [UserRole.AGENT, UserRole.ADMIN],
      'user': [UserRole.USER, UserRole.AGENT, UserRole.ADMIN]
    };

    const allowedRoles = accessRules[resourceType] || [];
    return allowedRoles.includes(userRole);
  }

  // Get active sessions (for admin purposes)
  getActiveSessions(): AuthSession[] {
    return Array.from(this.activeSessions.values());
  }
}

// Export types for use in other services
export type { AuthSession } from '../interfaces/index.js'; 