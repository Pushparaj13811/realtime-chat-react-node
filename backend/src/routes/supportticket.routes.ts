import express from 'express';
import { SupportTicketController } from '../controllers/SupportTicketController.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

// User routes
router.post('/create', SupportTicketController.createTicket);
router.get('/my-tickets', SupportTicketController.getMyTickets);
router.get('/:ticketId', SupportTicketController.getTicketById);

// Agent routes
router.get('/agent/assigned', SupportTicketController.getAgentTickets);

// Admin routes
router.post('/assign', SupportTicketController.assignTicket);
router.get('/admin/all', SupportTicketController.getTicketsForAdmin);
router.get('/admin/stats', SupportTicketController.getTicketStats);
router.patch('/:ticketId/status', SupportTicketController.updateTicketStatus);

export default router; 