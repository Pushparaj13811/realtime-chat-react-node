import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.post('/validate-session', asyncHandler(authController.validateSession));

// Protected routes
router.get('/profile', AuthMiddleware.authenticate, asyncHandler(authController.getProfile));
router.put('/status', AuthMiddleware.authenticate, asyncHandler(authController.updateStatus));
router.get('/agents/online', asyncHandler(authController.getOnlineAgents));
router.get('/agents/all', AuthMiddleware.authenticate, asyncHandler(authController.getAllAgents));

export default router; 