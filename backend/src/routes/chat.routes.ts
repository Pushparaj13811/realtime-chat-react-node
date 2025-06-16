import { Router } from 'express';
import { ChatController } from '../controllers/ChatController.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const chatController = new ChatController();

// All chat routes require authentication
router.use(AuthMiddleware.authenticate);

// Chat room routes
router.post('/rooms', asyncHandler(chatController.createChatRoom));
router.get('/rooms', asyncHandler(chatController.getUserChatRooms));
router.get('/rooms/agent', asyncHandler(chatController.getAgentChatRooms));
router.get('/rooms/:chatRoomId', asyncHandler(chatController.getChatRoom));
router.get('/rooms/:chatRoomId/messages', asyncHandler(chatController.getMessages));
router.get('/rooms/:chatRoomId/search', asyncHandler(chatController.searchMessages));
router.delete('/rooms/:chatRoomId', asyncHandler(chatController.closeChatRoom));

// Agent management routes
router.post('/assign-agent', asyncHandler(chatController.assignAgent));
router.post('/transfer', asyncHandler(chatController.transferChat));

// Message routes
router.get('/unread-count', asyncHandler(chatController.getUnreadCount));

export default router; 