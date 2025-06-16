# Real-time Chat Application Backend

A comprehensive real-time messaging system built with Node.js, Express, Socket.IO, MongoDB, and Redis following SOLID principles and clean architecture.

## 🚀 Features

### Core Messaging Features
- **Real-time messaging** with Socket.IO
- **Message delivery status** tracking (sent, delivered, read)
- **Private rooms** for user-agent communication
- **Typing indicators** and user presence
- **Message search** and history
- **File attachments** support
- **Message editing** and deletion

### Agent Management
- **Online/Offline agent status** tracking
- **Automatic agent assignment** for support chats
- **Chat transfer** between agents
- **Agent workload balancing**
- **Chat room statistics**

### Performance & Scalability
- **Redis caching** for chat history and user sessions
- **Database indexing** for optimal query performance
- **Session-based authentication** (without JWT)
- **Role-based access control** (User, Agent, Admin)

## 🏗️ Architecture

### Folder Structure
```
backend/src/
├── config/          # Configuration files
│   ├── config.ts    # Environment configuration
│   └── database.ts  # Database connections
├── types/           # TypeScript type definitions
│   └── index.ts     # Centralized types
├── interfaces/      # TypeScript interfaces
│   └── index.ts     # Centralized interfaces
├── models/          # MongoDB models
│   ├── User.ts      # User model
│   ├── Message.ts   # Message model
│   └── ChatRoom.ts  # ChatRoom model
├── services/        # Business logic layer
│   ├── AuthService.ts      # Authentication service
│   ├── MessageService.ts   # Message operations
│   ├── ChatRoomService.ts  # Chat room management
│   ├── CacheService.ts     # Redis caching
│   └── SocketService.ts    # Socket.IO handling
├── controllers/     # Request handlers
│   ├── AuthController.ts   # Auth endpoints
│   └── ChatController.ts   # Chat endpoints
├── routes/          # API route definitions
│   ├── auth.routes.ts      # Auth routes
│   ├── chat.routes.ts      # Chat routes
│   ├── admin.routes.ts     # Admin routes
│   └── index.ts            # Route aggregator
├── middlewares/     # Express middlewares
│   └── authMiddleware.ts   # Authentication middleware
├── utils/           # Utility functions
│   ├── ApiError.ts         # Custom error class
│   ├── ApiResponse.ts      # Standardized responses
│   └── asyncHandler.ts     # Async error handling
├── app.ts           # Express app configuration
└── index.ts         # Application entry point (main server)
```

## 🛠️ Technology Stack

- **Runtime**: Node.js with Bun
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Language**: TypeScript
- **Authentication**: Session-based (no JWT)

## 📦 Installation

1. **Clone and install dependencies**:
```bash
cd backend
bun install
```

2. **Set up environment variables**:
```bash
# Copy example environment file
cp .env.example .env

# Edit the .env file with your configuration
```

3. **Environment Variables**:
```env
# Database Configuration
DATABASE_URL=mongodb://localhost:27017/chat-app
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:3001
NODE_ENV=development
```

4. **Start the server**:
```bash
# Development
bun run dev

# Production
bun start
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/validate-session` - Validate session
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/status` - Update user status
- `GET /api/auth/agents/online` - Get online agents
- `GET /api/auth/agents/all` - Get all agents (admin only)

### Chat Management
- `POST /api/chat/rooms` - Create chat room
- `GET /api/chat/rooms` - Get user's chat rooms
- `GET /api/chat/rooms/agent` - Get agent's assigned rooms
- `GET /api/chat/rooms/:id` - Get specific chat room
- `GET /api/chat/rooms/:id/messages` - Get room messages
- `GET /api/chat/rooms/:id/search` - Search messages
- `DELETE /api/chat/rooms/:id` - Close chat room
- `POST /api/chat/assign-agent` - Assign agent to room
- `POST /api/chat/transfer` - Transfer chat to another agent
- `GET /api/chat/unread-count` - Get unread message count

### Admin
- `GET /api/admin/chat-stats` - Get chat statistics

### System
- `GET /api/health` - Health check

## 🔌 Socket.IO Events

### Client to Server
- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `send-message` - Send a message
- `message-delivered` - Mark message as delivered
- `message-read` - Mark message as read
- `typing` - Typing indicator
- `agent-status-update` - Update agent status
- `get-online-users` - Get online users
- `get-online-agents` - Get online agents

### Server to Client
- `new-message` - New message received
- `user-joined-room` - User joined room
- `user-left-room` - User left room
- `user-typing` - User typing status
- `message-status-updated` - Message status changed
- `user-status-changed` - User online/offline status
- `online-users` - List of online users
- `online-agents` - List of online agents
- `chat-history` - Chat message history
- `error` - Error notifications

## 🎯 Core Features

### User Roles
- **User**: Can create chats, send messages
- **Agent**: Can manage assigned chats, transfer chats
- **Admin**: Full access to all features and statistics

### Message Status Tracking
- **Sent**: Message stored in database
- **Delivered**: Message delivered to recipient's client
- **Read**: Message read by recipient

### Agent Management
- Automatic assignment based on availability
- Load balancing across agents
- Chat transfer capabilities
- Online/offline status tracking

### Caching Strategy
- **Chat History**: Recent messages cached in Redis
- **User Sessions**: Active sessions stored in memory and Redis
- **Online Users**: Real-time user presence in Redis
- **Agent Status**: Agent availability cached

## 🔒 Security Features

- Session-based authentication
- Role-based access control
- Input validation and sanitization
- Error handling and logging
- Rate limiting ready
- CORS configuration

## 📊 Monitoring & Logging

- Comprehensive error logging
- Database connection status
- Redis connection monitoring
- Session cleanup automation
- Performance tracking ready

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Configure production database URLs
3. Set up Redis cluster for scaling
4. Configure proper CORS origins
5. Set up process manager (PM2)
6. Configure reverse proxy (Nginx)
7. Set up SSL/TLS certificates
8. Configure monitoring and logging

### Docker Support
```dockerfile
# Example Dockerfile structure
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Follow TypeScript and ESLint rules
2. Maintain SOLID principles
3. Add comprehensive tests
4. Update documentation
5. Use conventional commit messages

## 📝 License

This project is licensed under the MIT License.
