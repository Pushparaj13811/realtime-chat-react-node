import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';

export class AuthMiddleware {
  private static authService = AuthService.getInstance();

  // Authenticate user session
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: 'Session ID required'
        });
        return;
      }

      const session = await AuthMiddleware.authService.validateSession(sessionId);

      if (!session) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired session'
        });
        return;
      }

      // Attach user to request
      (req as any).user = session;
      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }

  // Require specific role
  static requireRole(requiredRole: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const user = (req as any).user;

        if (!user) {
          res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
          return;
        }

        const hasPermission = AuthMiddleware.authService.hasPermission(
          user.role,
          requiredRole as any
        );

        if (!hasPermission) {
          res.status(403).json({
            success: false,
            message: `${requiredRole} role required`
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Role middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization error'
        });
      }
    };
  }

  // Require resource access
  static requireResourceAccess(resourceType: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const user = (req as any).user;

        if (!user) {
          res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
          return;
        }

        const canAccess = AuthMiddleware.authService.canAccessResource(
          user.role,
          resourceType
        );

        if (!canAccess) {
          res.status(403).json({
            success: false,
            message: `Access denied to ${resourceType}`
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Resource access middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization error'
        });
      }
    };
  }

  // Optional authentication (for public endpoints that can benefit from user context)
  static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.headers['x-session-id'] as string;

      if (sessionId) {
        const session = await AuthMiddleware.authService.validateSession(sessionId);
        if (session) {
          (req as any).user = session;
        }
      }

      next();
    } catch (error) {
      // Continue without authentication in case of error
      next();
    }
  }
} 