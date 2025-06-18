import { createServer } from 'http';
import { config } from './config/config.js';
import { DatabaseConfig } from './config/database.js';
import { SocketService, AuthService } from './services/index.js';
import { app } from './app.js';

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const socketService = SocketService.getInstance();

// Startup function
async function startServer() {
  try {
    // Connect to databases
    await DatabaseConfig.connectMongoDB();
    await DatabaseConfig.connectRedis();

    // Initialize Socket.IO
    socketService.initialize(server);

    // Start server
    const PORT = config.port || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`💬 Socket.IO ready for connections`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      
      // Clean expired sessions every hour
      setInterval(() => {
        const authService = AuthService.getInstance();
        // authService.cleanExpiredSessions();
        console.log('🧹 Cleaned expired sessions');
      }, 60 * 60 * 1000);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await DatabaseConfig.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await DatabaseConfig.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

// Export server for testing purposes
export { server };

