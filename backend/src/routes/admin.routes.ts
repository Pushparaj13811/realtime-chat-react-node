import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { AuthController } from '../controllers/AuthController.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Initialize controllers
const chatController = new ChatController();
const authController = new AuthController();

// Apply authentication and admin role requirement to all admin routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole(UserRole.ADMIN));

router.get('/stats', asyncHandler(authController.getAdminStats));   
router.get('/chat-stats', asyncHandler(chatController.getChatRoomStats));
router.get('/users', asyncHandler(authController.getAllUsers));
router.put('/users/:userId/status', asyncHandler(authController.updateUserStatusAdmin));
router.get('/agent-workloads', asyncHandler(chatController.getAgentWorkloadStats));
router.post('/transfer-agent', asyncHandler(chatController.transferAgentAdmin));
router.post('/assign-agent', asyncHandler(chatController.assignAgentAdmin));
router.post('/remove-agent', asyncHandler(chatController.removeAgentAdmin));
router.post('/transfer-agent-between-chats', asyncHandler(chatController.transferAgentBetweenChats));

export default router; 