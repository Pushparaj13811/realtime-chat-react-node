# 💬 **Real-Time Chat Application**

A comprehensive, production-ready real-time chat application with advanced features, built using modern technologies and following SOLID principles. This full-stack application provides seamless communication between users and support agents with real-time messaging, typing indicators, message status tracking, and comprehensive administrative features.

## 🌟 **Project Overview**

This application consists of two main components:
- **Frontend**: React + TypeScript + Vite with shadcn/ui components
- **Backend**: Node.js + Express + TypeScript with Socket.IO for real-time features

### **Key Highlights**
- 🔄 **Real-time bidirectional communication** with Socket.IO
- 👥 **Multi-role system** (User, Agent, Admin) with role-based access control
- 🛡️ **Session-based authentication** without JWT dependency
- 📊 **Admin dashboard** with agent management and system monitoring
- 💾 **MongoDB persistence** with Redis caching for optimal performance
- 🔔 **Browser notifications** with sound alerts
- 📈 **Export functionality** for chat history (JSON/CSV)

## ✨ **Complete Feature Set**

### 🔐 **Authentication & User Management**
- **Secure User Registration**: Public signup limited to USER role only
- **Multi-Role System**: USER, AGENT, and ADMIN with hierarchical permissions
- **Admin-Only Agent Creation**: Secure agent account creation through admin panel
- **Session Management**: Persistent login sessions with automatic validation
- **Password Security**: bcrypt hashing with salt rounds
- **Role-Based Access Control**: Strict permission checks for all operations

### 💬 **Real-Time Chat Features**
- **Instant Messaging**: Socket.IO powered real-time communication
- **Message Status Tracking**: Sent, Delivered, and Read receipts with visual indicators
- **Typing Indicators**: Live typing status with smart debouncing and timeout
- **Online Presence**: Real-time user status (Online/Offline)
- **Unread Count**: Per-room and total unread message tracking with badges

### 🎯 **Chat Room Management**
- **Multiple Room Types**: Support for various conversation types
- **Agent Assignment**: Automatic and manual agent assignment to support chats
- **Chat Transfer**: Transfer conversations between agents with history tracking
- **Participant Management**: Real-time participant list with status indicators
- **Room History**: Message persistence with search functionality
- **Room Metadata**: Tags, priority levels, and customer information

### 📊 **Export & Analytics**
- **Data Export**: Export chat history in JSON or CSV formats with Papa Parse
- **Date Filtering**: Export messages within specific date ranges
- **Comprehensive Data**: Include metadata, participant info, and timestamps
- **Preview Functionality**: View export data before downloading
- **Agent Workload**: Track agent performance and chat distribution

### 🛡️ **Administrative Features**
- **Admin Panel**: Comprehensive administration interface (Admin role only)
- **Agent Management**: Create, manage, and monitor support agent accounts
- **User Oversight**: View and manage all user accounts with status controls
- **System Monitoring**: Real-time system status, statistics, and health checks
- **Agent Workload Dashboard**: Monitor agent performance and chat distribution
- **Security Controls**: Role-based access control and privilege management

### 🔔 **Notification System**
- **Browser Notifications**: Native browser notifications for new messages
- **Sound Alerts**: Audio notifications with customizable settings
- **Permission Management**: User-controlled notification preferences
- **Smart Notifications**: Only notify when user is not actively viewing chat
- **Page Visibility Detection**: Automatic notification control based on focus

### 📱 **User Experience**
- **Responsive Design**: Mobile-first design with adaptive layouts
- **Modern UI**: Clean, professional interface using shadcn/ui components
- **Accessibility**: ARIA compliant with keyboard navigation support
- **Loading States**: Smooth loading indicators and comprehensive error handling
- **Theme-Aware**: Modern design system with CSS variables
- **Performance Optimized**: Redis caching and efficient React patterns

## 🏗️ **Architecture & Technology Stack**

### **Frontend Stack**
```typescript
{
  "framework": "React 19.1.0",
  "language": "TypeScript 5.8.3",
  "buildTool": "Vite 6.3.5",
  "styling": "TailwindCSS 4.1.10",
  "uiComponents": "shadcn/ui + Radix UI",
  "routing": "React Router DOM 7.6.2",
  "realTime": "Socket.IO Client 4.8.1",
  "httpClient": "Axios 1.10.0",
  "stateManagement": "React Context + Hooks",
  "dateHandling": "date-fns 4.1.0",
  "animations": "Framer Motion 12.18.1",
  "icons": "Lucide React 0.515.0",
  "csvExport": "Papa Parse 5.5.3"
}
```

### **Backend Stack**
```typescript
{
  "runtime": "Node.js with Bun",
  "framework": "Express.js 5.1.0",
  "language": "TypeScript 5.0.0+",
  "database": "MongoDB with Mongoose 8.15.2",
  "cache": "Redis 5.5.6",
  "realTime": "Socket.IO 4.8.1",
  "authentication": "Session-based (bcrypt 6.0.0)",
  "validation": "Custom middleware",
  "cors": "CORS 2.8.5",
  "environmentConfig": "dotenv 16.5.0"
}
```

### **Project Structure**

```
📁 realtime-chat-react-node/
├── 📁 frontend/                    # React TypeScript Frontend
│   ├── 📁 src/
│   │   ├── 📁 components/         # React Components
│   │   │   ├── 📁 auth/          # Authentication Components
│   │   │   │   ├── AuthPage.tsx           # Auth routing
│   │   │   │   ├── LoginForm.tsx          # User login
│   │   │   │   ├── SignupForm.tsx         # Public registration
│   │   │   │   └── AgentRegistrationForm.tsx # Admin-only agent creation
│   │   │   ├── 📁 admin/         # Administrative Components
│   │   │   │   ├── AdminPanel.tsx         # Main admin interface
│   │   │   │   ├── AgentManagement.tsx    # Agent management
│   │   │   │   └── AgentWorkloadDashboard.tsx # Performance monitoring
│   │   │   ├── 📁 chat/          # Chat Components
│   │   │   │   ├── ChatLayout.tsx         # Main layout
│   │   │   │   ├── ChatWindow.tsx         # Chat interface
│   │   │   │   ├── MessageItem.tsx        # Message display
│   │   │   │   ├── MessageInput.tsx       # Message composition
│   │   │   │   ├── ChatRoomList.tsx       # Room navigation
│   │   │   │   ├── OnlineUsers.tsx        # User presence
│   │   │   │   ├── TypingIndicator.tsx    # Typing status
│   │   │   │   ├── ExportDialog.tsx       # Data export
│   │   │   │   ├── NotificationSettings.tsx # Notification preferences
│   │   │   │   └── UnreadCountDebug.tsx   # Debug component
│   │   │   └── 📁 ui/           # shadcn/ui Components
│   │   ├── 📁 contexts/         # React Context Providers
│   │   │   ├── AuthContext.tsx           # Authentication state
│   │   │   └── ChatContext.tsx           # Chat state management
│   │   ├── 📁 hooks/           # Custom React Hooks
│   │   │   ├── useTyping.ts             # Typing indicator logic
│   │   │   ├── useUnreadCount.ts        # Unread message tracking
│   │   │   └── usePageVisibility.ts     # Page focus detection
│   │   ├── 📁 services/        # API & External Services
│   │   │   ├── api.ts                   # HTTP API client
│   │   │   ├── socket.ts                # Socket.IO client
│   │   │   └── notification.ts          # Notification service
│   │   ├── 📁 types/           # TypeScript Definitions
│   │   └── 📁 lib/             # Utility Functions
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── 📁 backend/                     # Node.js TypeScript Backend
│   ├── 📁 src/
│   │   ├── 📁 config/           # Configuration
│   │   │   ├── config.ts                # Environment config
│   │   │   └── database.ts              # DB connections
│   │   ├── 📁 models/           # MongoDB Models
│   │   │   ├── User.ts                  # User model
│   │   │   ├── Message.ts               # Message model
│   │   │   └── ChatRoom.ts              # ChatRoom model
│   │   ├── 📁 services/         # Business Logic
│   │   │   ├── AuthService.ts           # Authentication
│   │   │   ├── MessageService.ts        # Message operations
│   │   │   ├── ChatRoomService.ts       # Chat room management
│   │   │   ├── CacheService.ts          # Redis caching
│   │   │   └── SocketService.ts         # Socket.IO handling
│   │   ├── 📁 controllers/      # Request Handlers
│   │   │   ├── AuthController.ts        # Auth endpoints
│   │   │   └── ChatController.ts        # Chat endpoints
│   │   ├── 📁 routes/           # API Routes
│   │   │   ├── auth.routes.ts           # Auth routes
│   │   │   ├── chat.routes.ts           # Chat routes
│   │   │   ├── admin.routes.ts          # Admin routes
│   │   │   └── index.ts                 # Route aggregator
│   │   ├── 📁 middlewares/      # Express Middlewares
│   │   │   └── authMiddleware.ts        # Authentication middleware
│   │   ├── 📁 utils/           # Utility Functions
│   │   │   ├── ApiError.ts             # Custom error handling
│   │   │   ├── ApiResponse.ts          # Standardized responses
│   │   │   └── asyncHandler.ts         # Async error handling
│   │   ├── 📁 types/           # TypeScript Definitions
│   │   ├── 📁 interfaces/      # TypeScript Interfaces
│   │   ├── 📁 scripts/         # Database Scripts
│   │   │   └── seed.ts                 # Database seeding
│   │   ├── app.ts              # Express app configuration
│   │   └── index.ts            # Application entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── bun.lock
└── README.md                      # This comprehensive documentation
```

## 🚀 **Complete Setup Guide**

### **Prerequisites**

Before starting, ensure you have the following installed:

```bash
# Required software
Node.js 20+ (with npm)
MongoDB 6.0+
Redis 7.0+
Git

# Optional but recommended
MongoDB Compass (for database visualization)
Redis Commander (for cache monitoring)
VS Code with TypeScript extension
```

### **Step 1: Clone the Repository**

```bash
# Clone the repository
git clone https://github.com/Pushparaj13811/realtime-chat-react-node.git
cd realtime-chat-react-node

# Verify project structure
ls -la
# Should show: frontend/ backend/ README.md .env.sample files
```

### **Step 2: Backend Setup**

```bash
# Navigate to backend directory
cd backend

# Install dependencies using npm or bun
npm install
# OR if you have Bun installed
bun install

# Copy sample environment configuration
cp .env.sample .env

# Edit environment variables as needed
# The sample file contains all required variables with default values:
# - DATABASE_URL=mongodb://localhost:27017/chat-app
# - DATABASE_DB_NAME=chat-app  
# - REDIS_HOST=localhost
# - REDIS_PORT=6379
# - REDIS_PASSWORD=
# - REDIS_DB=0
# - PORT=3000
# - FRONTEND_URL=http://localhost:5173
# - NODE_ENV=development

# Optional: customize the .env file for your environment
nano .env  # or use your preferred editor
```

### **Step 3: Database Setup**

```bash
# Ensure MongoDB is running
# On macOS with Homebrew:
brew services start mongodb-community

# On Ubuntu/Debian:
sudo systemctl start mongod

# On Windows: Start MongoDB service from Services panel

# Ensure Redis is running
# On macOS with Homebrew:
brew services start redis

# On Ubuntu/Debian:
sudo systemctl start redis-server

# On Windows: Start Redis service
```

### **Step 4: Seed Database (Optional)**

```bash
# Still in backend directory
# Seed database with sample data including Nepali users
npm run seed
# OR
bun run seed

# This creates sample users:
# - Admin: ram.admin@hamrotech.com
# - Agents: suresh.agent@hamrotech.com, sunita.agent@hamrotech.com  
# - Users: aarti.paudel@technepal.com, binod.sharma@digitalnepal.com, etc.
# All passwords: password123
```

### **Step 5: Start Backend Server**

```bash
# Development mode with auto-reload
npm run dev
# OR
bun run dev

# Production mode
npm run build && npm start
# OR
bun run build && bun start

# Expected output:
# ✅ Connected to MongoDB
# ✅ Connected to Redis  
# 🚀 Server running on port 3000
# 📊 Health check: http://localhost:3000/api/health
# 💬 Socket.IO ready for connections
```

### **Step 6: Frontend Setup**

```bash
# Open new terminal and navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Copy sample environment configuration
cp .env.sample .env.local

# Edit environment variables as needed
# The sample file contains all required variables with default values:
# - VITE_API_URL=http://localhost:4000/api
# - VITE_SOCKET_URL=http://localhost:4000

# Optional: customize the .env.local file for your environment
nano .env.local  # or use your preferred editor
```

### **Step 7: Start Frontend Development Server**

```bash
# Start development server
npm run dev

# Expected output:
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
# ➜  press h to show help

# Build for production
npm run build

# Preview production build
npm run preview
```

### **Step 8: Verify Installation**

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   # Should return: {"status":"OK","timestamp":"..."}
   ```

2. **Frontend Access**:
   - Open browser to `http://localhost:5173`
   - Should see the authentication page

3. **Database Connection**:
   ```bash
   # Check MongoDB connection
   mongosh chat-app
   db.users.countDocuments()
   
   # Check Redis connection  
   redis-cli ping
   # Should return: PONG
   ```

## 🎭 **Demo Accounts & Testing**

### **Seeded Demo Accounts (Nepali Context)**

```typescript
// Administrator Account
{
  email: "ram.admin@hamrotech.com",
  password: "password123", 
  role: "ADMIN",
  name: "Ram Shrestha (मुख्य प्रशासक)",
  location: "काठमाडौं, नेपाल"
}

// Support Agent Accounts
{
  email: "suresh.agent@hamrotech.com",
  password: "password123",
  role: "AGENT", 
  name: "Suresh Gurung (प्राविधिक सहायता विशेषज्ञ)",
  department: "Technical Support",
  location: "पोखरा, नेपाल"
}

{
  email: "sunita.agent@hamrotech.com", 
  password: "password123",
  role: "AGENT",
  name: "Sunita Thapa (बिलिङ र खाता व्यवस्थापन विशेषज्ञ)",
  department: "Billing",
  location: "भक्तपुर, नेपाल"
}

// Regular User Accounts
{
  email: "aarti.paudel@technepal.com",
  password: "password123",
  role: "USER",
  name: "Aarti Paudel (Software Engineer)",
  location: "काठमाडौं, नेपाल"
}

{
  email: "binod.sharma@digitalnepal.com",
  password: "password123", 
  role: "USER",
  name: "Binod Sharma (Digital Marketing Manager)",
  location: "ललितपुर, नेपाल"
}
```

### **Testing Scenarios**

1. **User Registration & Authentication**:
   - Register new user account
   - Login with demo accounts
   - Test role-based access control

2. **Real-time Chat**:
   - Open multiple browser tabs with different users
   - Send messages and verify real-time delivery
   - Test typing indicators and online status

3. **Admin Features**:
   - Login as admin (ram.admin@hamrotech.com)
   - Create new agent accounts
   - Monitor system statistics

4. **Agent Features**:
   - Login as agent (suresh.agent@hamrotech.com)
   - Handle support chats
   - Transfer chats to other agents

## 🔗 **API Documentation**

### **Authentication Endpoints**

```typescript
// User Registration (Public - USER role only)
POST /api/auth/register
Body: {
  username: string;
  email: string;
  password: string;
}

// User Login  
POST /api/auth/login
Body: {
  email: string;
  password: string;
}

// Session Validation
POST /api/auth/validate-session
Headers: {
  sessionId: string;
}

// User Logout
POST /api/auth/logout
Headers: {
  sessionId: string;
}

// Get User Profile
GET /api/auth/profile
Headers: {
  sessionId: string;
}

// Update User Status
PUT /api/auth/status
Headers: {
  sessionId: string;
}
Body: {
  status: 'online' | 'away' | 'busy' | 'offline';
}

// Get Online Agents (for users)
GET /api/auth/agents/online

// Get All Agents (admin only)
GET /api/auth/agents/all
Headers: {
  sessionId: string; // Must be admin session
}
```

### **Chat Management Endpoints**

```typescript
// Create Chat Room
POST /api/chat/rooms
Headers: {
  sessionId: string;
}
Body: {
  name?: string;
  type: 'direct' | 'support' | 'group';
  metadata?: {
    subject?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

// Get User's Chat Rooms
GET /api/chat/rooms
Headers: {
  sessionId: string;
}

// Get Agent's Assigned Rooms
GET /api/chat/rooms/agent
Headers: {
  sessionId: string; // Must be agent session
}

// Get Specific Chat Room
GET /api/chat/rooms/:id
Headers: {
  sessionId: string;
}

// Get Room Messages
GET /api/chat/rooms/:id/messages
Headers: {
  sessionId: string;
}
Query: {
  page?: number;
  limit?: number;
}

// Search Messages in Room
GET /api/chat/rooms/:id/search
Headers: {
  sessionId: string;
}
Query: {
  query: string;
  page?: number;
  limit?: number;
}

// Close Chat Room
DELETE /api/chat/rooms/:id
Headers: {
  sessionId: string;
}

// Assign Agent to Room
POST /api/chat/assign-agent
Headers: {
  sessionId: string; // Must be admin or agent session
}
Body: {
  chatRoomId: string;
  agentId: string;
}

// Transfer Chat to Another Agent
POST /api/chat/transfer
Headers: {
  sessionId: string; // Must be agent session
}
Body: {
  chatRoomId: string;
  newAgentId: string;
  reason?: string;
}

// Get Unread Message Count
GET /api/chat/unread-count
Headers: {
  sessionId: string;
}
```

### **Admin Endpoints**

```typescript
// Get Chat Statistics (admin only)
GET /api/admin/chat-stats
Headers: {
  sessionId: string; // Must be admin session
}

// Get Agent Workloads (admin only)
GET /api/admin/agent-workloads
Headers: {
  sessionId: string; // Must be admin session
}

// Get All Chat Rooms (admin only)
GET /api/admin/chat-rooms
Headers: {
  sessionId: string; // Must be admin session
}

// Get All Users (admin only)
GET /api/admin/users
Headers: {
  sessionId: string; // Must be admin session
}
```

### **System Endpoints**

```typescript
// Health Check
GET /api/health
Response: {
  status: "OK";
  timestamp: string;
  uptime: number;
  memory: object;
  database: string;
  redis: string;
}
```

## 🔌 **Socket.IO Events Documentation**

### **Client to Server Events**

```typescript
// Authentication (handled automatically by client)
socket.auth = {
  sessionId: string;
}

// Join a chat room
socket.emit('join-room', {
  chatRoomId: string;
});

// Leave a chat room
socket.emit('leave-room', {
  chatRoomId: string;
});

// Send a message
socket.emit('send-message', {
  chatRoomId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  replyTo?: string;
  metadata?: object;
});

// Mark message as delivered
socket.emit('message-delivered', {
  messageId: string;
});

// Mark message as read
socket.emit('message-read', {
  messageId: string;
});

// Send typing indicator
socket.emit('typing', {
  chatRoomId: string;
  isTyping: boolean;
});

// Update agent status (agents only)
socket.emit('agent-status-update', {
  status: 'online' | 'away' | 'busy' | 'offline';
});

// Get online users
socket.emit('get-online-users');

// Get online agents
socket.emit('get-online-agents');

// Set active chat (for notification control)
socket.emit('set-active-chat', {
  chatRoomId: string | null;
});
```

### **Server to Client Events**

```typescript
// New message received
socket.on('new-message', (message: {
  _id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType: string;
  status: string;
  createdAt: string;
  sender: {
    username: string;
    role: string;
  };
}));

// User joined room
socket.on('user-joined-room', (data: {
  chatRoomId: string;
  user: {
    userId: string;
    username: string;
    role: string;
  };
}));

// User left room
socket.on('user-left-room', (data: {
  chatRoomId: string;
  user: {
    userId: string;
    username: string;
    role: string;
  };
}));

// User typing status
socket.on('user-typing', (data: {
  userId: string;
  username: string;
  chatRoomId: string;
  isTyping: boolean;
}));

// Message status updated
socket.on('message-status-updated', (data: {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  userId: string;
}));

// User status changed
socket.on('user-status-changed', (data: {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  isOnline: boolean;
}));

// Online users list
socket.on('online-users', (users: Array<{
  userId: string;
  username: string;
  role: string;
  socketId: string;
}>));

// Online agents list
socket.on('online-agents', (agents: Array<{
  _id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  isOnline: boolean;
  specialization?: string;
  department?: string;
}>));

// Chat history
socket.on('chat-history', (data: {
  chatRoomId: string;
  messages: Array<object>;
}));

// Agent assignment notification
socket.on('agent-assignment-received', (data: {
  chatRoom: object;
  reason: string;
}));

// Agent removed notification
socket.on('agent-removed', (data: {
  chatRoomId: string;
  removedAgentId: string;
  newAgent: object | null;
  reason: string;
  timestamp: string;
}));

// Error notifications
socket.on('error', (error: {
  message: string;
  code?: string;
}));

// Connection status
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', (reason: string) => {
  console.log('Disconnected from server:', reason);
});
```

## 🔒 **Security & Best Practices**

### **Authentication Security**
- **Session-based authentication** without JWT dependency
- **Password hashing** with bcrypt (12 salt rounds)
- **Role-based access control** with strict permission checks
- **Session validation** on every API request
- **Automatic session cleanup** to prevent memory leaks
- **Admin-only agent creation** to prevent privilege escalation

### **API Security**
- **CORS configuration** with specific origin allowlist
- **Input validation** and sanitization on all endpoints
- **Error handling** without sensitive information leakage
- **Rate limiting ready** (can be implemented with express-rate-limit)
- **SQL/NoSQL injection protection** through Mongoose ODM
- **XSS protection** through proper input handling

### **Socket.IO Security**
- **Authentication middleware** for all socket connections
- **Room-based message delivery** to prevent eavesdropping
- **Permission checks** before allowing room joins
- **Automatic cleanup** of stale connections
- **Error handling** for malformed events

### **Data Protection**
- **Environment variables** for sensitive configuration
- **Database connection security** with authentication
- **Redis security** with password protection (optional)
- **Session data protection** in memory and cache
- **Sensitive data exclusion** from API responses

## 🚀 **Deployment Guide**

### **Production Environment Setup**

```bash
# Copy sample environment files for production
cp backend/.env.sample backend/.env
cp frontend/.env.sample frontend/.env.local

# Update backend/.env for production
NODE_ENV=production
PORT=443
FRONTEND_URL=https://your-domain.com
DATABASE_URL=mongodb://username:password@cluster.mongodb.net/chat-app
REDIS_HOST=your-redis-host
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-password

# Update frontend/.env.local for production
VITE_API_URL=https://api.your-domain.com
VITE_SOCKET_URL=https://api.your-domain.com
```

### **Docker Deployment**

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### **Docker Compose**

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mongodb://admin:password@mongodb:27017/chat-app
      - REDIS_HOST=redis
    depends_on:
      - mongodb
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
  redis_data:
```

## 🐛 **Troubleshooting Guide**

### **Common Issues & Solutions**

#### **Backend Issues**

```bash
# MongoDB Connection Failed
Error: "MongooseError: Operation timed out"
Solution:
1. Check MongoDB service: systemctl status mongod
2. Verify DATABASE_URL in .env
3. Check firewall settings: sudo ufw allow 27017
4. Test connection: mongosh "mongodb://localhost:27017/chat-app"

# Redis Connection Failed  
Error: "Redis connection failed"
Solution:
1. Check Redis service: systemctl status redis
2. Verify REDIS_HOST and REDIS_PORT in .env
3. Test connection: redis-cli ping
4. Check Redis password if configured

# Socket.IO Authentication Failed
Error: "Authentication error: Invalid session"
Solution:
1. Clear browser cookies and localStorage
2. Restart backend server
3. Check session validation in AuthService
4. Verify sessionId in browser developer tools
```

#### **Frontend Issues**

```bash
# Build Errors
Error: "Cannot resolve module '@/components/...'"
Solution:
1. Check tsconfig.json path mapping
2. Verify vite.config.ts alias configuration
3. Run: npm install && npm run dev

# API Connection Failed
Error: "Network Error" or "CORS Error"
Solution:
1. Verify backend server is running on correct port
2. Check VITE_API_URL in .env.local
3. Ensure CORS configuration in backend
4. Test API directly: curl http://localhost:4000/api/health

# Socket.IO Connection Failed
Error: "WebSocket connection failed"
Solution:
1. Check VITE_SOCKET_URL in .env.local
2. Verify Socket.IO server is running
3. Check browser console for detailed errors
4. Test with: localStorage.setItem('debug', 'socket.io-client:*')
```

#### **Real-time Features Not Working**

```bash
# Messages Not Delivering
1. Check Socket.IO connection status
2. Verify user authentication
3. Check room membership
4. Monitor browser console and server logs

# Typing Indicators Not Showing
1. Verify typing event emission
2. Check useTyping hook implementation
3. Ensure proper cleanup on unmount
4. Monitor socket events in browser dev tools

# Online Status Not Updating
1. Check handleConnection in SocketService
2. Verify user status updates in database
3. Monitor Socket.IO disconnection events
4. Check status cleanup interval
```

### **Debug Mode**

```typescript
// Enable Socket.IO client debugging
localStorage.setItem('debug', 'socket.io-client:*');

// Enable verbose logging in backend
DEBUG=true npm run dev

// Monitor Socket.IO events
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});

// Check authentication state
console.log('Auth state:', localStorage.getItem('authState'));

// Monitor API requests
// Enable in browser dev tools → Network tab
```

## 📊 **Performance Optimization**

### **Backend Performance**
- **Redis caching** for frequently accessed data
- **Database indexing** on commonly queried fields
- **Connection pooling** for MongoDB
- **Session cleanup** to prevent memory leaks
- **Efficient Socket.IO** event handling
- **Pagination** for large data sets

### **Frontend Performance**
- **React.memo** for component optimization
- **useMemo and useCallback** for expensive operations
- **Code splitting** with dynamic imports
- **Lazy loading** for non-critical components
- **Efficient re-renders** with proper dependency arrays
- **Image optimization** and lazy loading

### **Monitoring & Analytics**
- **Error logging** with detailed stack traces
- **Performance metrics** collection
- **Database query optimization**
- **Memory usage monitoring**
- **Connection count tracking**
- **Response time measurement**

## 🤝 **Contributing Guidelines**

### **Development Workflow**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow TypeScript and ESLint rules
4. Write comprehensive tests
5. Update documentation
6. Commit with conventional messages
7. Push and create Pull Request

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Follow React and Node.js best practices
- **SOLID Principles**: Maintain clean architecture
- **Component Patterns**: Functional components with hooks
- **Error Handling**: Comprehensive try-catch blocks
- **Documentation**: JSDoc comments for complex functions

### **Testing Guidelines**
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and Socket.IO events
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Monitor response times and memory usage

## 📄 **License & Support**

This project is licensed under the **MIT License** - see the LICENSE file for details.

### **Getting Help**
- 📚 **Documentation**: This comprehensive README
- 🐛 **Bug Reports**: Create issues with detailed reproduction steps
- 💡 **Feature Requests**: Propose new features with use cases
- 🤝 **Community**: Join discussions and share experiences
- 📧 **Direct Support**: Contact maintainers for critical issues

### **Acknowledgments**
- **Socket.IO Team**: For real-time communication capabilities
- **Radix UI & shadcn/ui**: For accessible component primitives
- **MongoDB & Redis**: For robust data storage and caching
- **TypeScript Team**: For type-safe development experience
- **React Team**: For the excellent frontend framework

---

**🎉 Congratulations! You now have a fully functional, production-ready real-time chat application with comprehensive features, security, and scalability built into its core architecture.**

---

*Built with ❤️ using React, TypeScript, Node.js, MongoDB, Redis, and Socket.IO* 