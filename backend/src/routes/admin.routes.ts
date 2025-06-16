import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { AuthController } from '../controllers/AuthController.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserRole } from '../types/index.js';

const router = Router();
const chatController = new ChatController();
const authController = new AuthController();

// All admin routes require authentication and admin role
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole(UserRole.ADMIN));

// Admin statistics
router.get('/stats', asyncHandler(authController.getAdminStats));
router.get('/chat-stats', asyncHandler(chatController.getChatRoomStats));

// User management
router.get('/users', asyncHandler(authController.getAllUsers));
router.put('/users/:userId/status', asyncHandler(authController.updateUserStatusAdmin));

export default router; 