import { Router } from 'express';
import authRoutes from './auth.routes.js';
import chatRoutes from './chat.routes.js';
import adminRoutes from './admin.routes.js';
import supportTicketRoutes from './supportticket.routes.js';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Chat API is running'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/support-tickets', supportTicketRoutes);

export default router; 