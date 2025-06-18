import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class AuthMiddleware {
  private static authService = AuthService.getInstance();

  // Authenticate user session
  static authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;

    if (!sessionId) {
      throw new ApiError(401, 'Session ID required');
    }

    const session = await AuthMiddleware.authService.validateSession(sessionId);

    if (!session) {
      throw new ApiError(401, 'Invalid or expired session');
    }

    // Attach user to request
    (req as any).user = session;
    next();
  });

  // Require specific role
  static requireRole(requiredRole: string) {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = (req as any).user;

      if (!user) {
        throw new ApiError(401, 'Authentication required');
      }

      const hasPermission = AuthMiddleware.authService.hasPermission(
        user.role,
        requiredRole as any
      );

      if (!hasPermission) {
        throw new ApiError(403, `${requiredRole} role required`);
      }

      next();
    });
  }

  // Require resource access
  static requireResourceAccess(resourceType: string) {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = (req as any).user;

      if (!user) {
        throw new ApiError(401, 'Authentication required');
      }

      const canAccess = AuthMiddleware.authService.canAccessResource(
        user.role,
        resourceType
      );

      if (!canAccess) {
        throw new ApiError(403, `Access denied to ${resourceType}`);
      }

      next();
    });
  }

  // Optional authentication (for public endpoints that can benefit from user context)
  static optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.headers['x-session-id'] as string;

    if (sessionId) {
      const session = await AuthMiddleware.authService.validateSession(sessionId);
      if (session) {
        (req as any).user = session;
      }
    }

    next();
  });
} 