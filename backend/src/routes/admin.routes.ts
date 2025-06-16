import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserRole } from '../types/index.js';

const router = Router();
const chatController = new ChatController();

// All admin routes require authentication and admin role
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole(UserRole.ADMIN));

// Admin statistics
router.get('/chat-stats', asyncHandler(chatController.getChatRoomStats));

export default router; 