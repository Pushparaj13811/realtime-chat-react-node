import bcrypt from 'bcrypt';
import type { IUser } from '../interfaces/index.js';
import { User } from '../models/User.js';
import { UserRole, UserStatus } from '../types/index.js';
import type { AuthSession, LoginResult, RegisterResult } from '../interfaces/index.js';
import { CacheService } from './CacheService.js';
import { ApiError } from '../utils/apiError.js';

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
  }): Promise<RegisterResult> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, { username: userData.username }]
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
    } catch (error) {
      console.error('Registration error:', error);
      throw new ApiError(500, 'Registration failed');
    }
  }

  // User login
  async login(email: string, password: string): Promise<LoginResult> {
    try {
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
    } catch (error) {
      console.error('Login error:', error);
      throw new ApiError(500, 'Login failed');
    }
  }

  // Session validation
  async validateSession(sessionId: string): Promise<AuthSession | null> {
    try {
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
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Logout
  async logout(sessionId: string): Promise<boolean> {
    try {
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
    } catch (error) {
      console.error('Logout error:', error);
      throw new ApiError(500, 'Logout failed');
    }
  }

  // Role-based authorization
  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.AGENT]: 1,
      [UserRole.ADMIN]: 2
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  // Check if user can access resource
  canAccessResource(userRole: UserRole, resourceType: string): boolean {
    const permissions = {
      [UserRole.USER]: ['chat', 'profile'],
      [UserRole.AGENT]: ['chat', 'profile', 'agent-dashboard', 'manage-chats'],
      [UserRole.ADMIN]: ['chat', 'profile', 'agent-dashboard', 'manage-chats', 'admin-panel', 'manage-users']
    };

    return permissions[userRole]?.includes(resourceType) || false;
  }

  // Get user by ID
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      return await User.findById(userId).select('-password');
    } catch (error) {
      console.error('Get user error:', error);
      throw new ApiError(500, 'Failed to get user');
    }
  }

  // Update user status
  async updateUserStatus(userId: string, status: UserStatus, socketId?: string): Promise<boolean> {
    try {
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
    } catch (error) {
      console.error('Update user status error:', error);
      throw new ApiError(500, 'Failed to update user status');
    }
  }

  // Get all active sessions
  getActiveSessions(): AuthSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Get online agents
  async getOnlineAgents(): Promise<IUser[]> {
    try {
      return await User.find({
        role: UserRole.AGENT,
        isOnline: true
      }).select('-password');
    } catch (error) {
      console.error('Get online agents error:', error);
      throw new ApiError(500, 'Failed to get online agents');
    }
  }

  // Get all agents
  async getAllAgents(): Promise<IUser[]> {
    try {
      return await User.find({
        role: { $in: [UserRole.AGENT, UserRole.ADMIN] }
      }).select('-password');
    } catch (error) {
      console.error('Get all agents error:', error);
      throw new ApiError(500, 'Failed to get agents');
    }
  }

  // Helper method to generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean expired sessions (should be called periodically)
  cleanExpiredSessions(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.createdAt.getTime() > maxAge) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

// Export types for use in other services
export type { AuthSession } from '../interfaces/index.js'; 