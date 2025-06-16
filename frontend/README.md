# Chat Application Frontend

A modern, real-time chat application built with React, TypeScript, and shadcn/ui components. This frontend provides a comprehensive chat experience with real-time messaging, user management, and administrative features.

## ✨ Features

### 🔐 Authentication & User Management
- **Secure User Registration**: Dedicated signup form for regular users
- **Multi-Role System**: Support for User, Agent, and Admin roles
- **Admin-Only Agent Registration**: Secure agent account creation through admin panel
- **Session Management**: Persistent login sessions with automatic validation
- **Demo Accounts**: Pre-configured test accounts for each role

### 💬 Real-Time Chat
- **Instant Messaging**: Socket.IO powered real-time communication
- **Typing Indicators**: Live typing status with smart debouncing
- **Online Presence**: Real-time user status (Online/Away/Busy/Offline)
- **Message Status**: Delivery and read receipts with visual indicators
- **Unread Count**: Per-room and total unread message tracking

### 🎯 Chat Room Management
- **Multiple Room Types**: Support for direct messages, group chats, and support tickets
- **Room Assignments**: Agent assignment and transfer capabilities
- **Participant Management**: Real-time participant list with status indicators
- **Room History**: Message persistence and search functionality

### 📊 Export & Analytics
- **Data Export**: Export chat history in JSON or CSV formats
- **Date Filtering**: Export messages within specific date ranges
- **Statistics**: Message counts, participant info, and room metadata
- **Preview**: View export data before downloading

### 🛡️ Administrative Features
- **Admin Panel**: Comprehensive administration interface (Admin role only)
- **Agent Management**: Create and manage support agent accounts
- **User Oversight**: View and manage all user accounts
- **System Monitoring**: Real-time system status and analytics
- **Security Controls**: Role-based access control and privilege management

### 📱 User Experience
- **Responsive Design**: Mobile-first design with adaptive layouts
- **Modern UI**: Clean, professional interface using shadcn/ui components
- **Accessibility**: ARIA compliant with keyboard navigation support
- **Loading States**: Smooth loading indicators and error handling
- **Dark Mode Ready**: Theme-aware component design

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API server running on port 3000

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Configuration

Create a `.env.local` file with:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

## 🎭 Demo Accounts

### User Account
- **Email**: `user@example.com`
- **Password**: `password123`
- **Role**: USER
- **Features**: Basic chat functionality, create rooms, join conversations

### Support Agent Account
- **Email**: `agent@example.com`
- **Password**: `password123`
- **Role**: AGENT
- **Features**: Handle support tickets, access agent tools, manage customer conversations

### Administrator Account
- **Email**: `admin@example.com`
- **Password**: `password123`
- **Role**: ADMIN
- **Features**: Full system access, user management, agent creation, system configuration

## 🔒 Security Features

### User Registration Security
- **Role Restrictions**: Public signup limited to USER role only
- **Admin-Controlled Agent Creation**: Agent accounts can only be created by administrators
- **Password Requirements**: Strong password validation with complexity rules
- **Email Validation**: RFC-compliant email format validation
- **Session Security**: Secure session management with automatic cleanup

### Access Control
- **Role-Based Permissions**: Different feature access based on user roles
- **Admin Panel Protection**: Administrative features require ADMIN role
- **Session Validation**: Automatic session verification on API requests
- **Privilege Escalation Protection**: Users cannot self-promote to higher roles

## 🏗️ Architecture

### Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   │   ├── AuthPage.tsx       # Auth routing component
│   │   ├── LoginForm.tsx      # User login form
│   │   ├── SignupForm.tsx     # Public user registration
│   │   └── AgentRegistrationForm.tsx  # Admin-only agent creation
│   ├── admin/          # Administrative components
│   │   └── AdminPanel.tsx     # Complete admin interface
│   ├── chat/           # Chat-related components
│   │   ├── ChatLayout.tsx     # Main application layout
│   │   ├── ChatWindow.tsx     # Chat interface
│   │   ├── MessageItem.tsx    # Individual message display
│   │   ├── MessageInput.tsx   # Message composition
│   │   ├── ChatRoomList.tsx   # Room navigation
│   │   ├── OnlineUsers.tsx    # User presence
│   │   ├── TypingIndicator.tsx # Typing status
│   │   └── ExportDialog.tsx   # Data export interface
│   └── ui/             # shadcn/ui components
├── contexts/           # React context providers
│   ├── AuthContext.tsx        # Authentication state
│   └── ChatContext.tsx        # Chat state management
├── hooks/              # Custom React hooks
│   ├── useTyping.ts           # Typing indicator logic
│   └── useUnreadCount.ts      # Unread message tracking
├── services/           # API and external services
│   ├── api.ts                 # HTTP API client
│   ├── socket.ts              # Socket.IO client
│   └── export.ts              # Data export utilities
├── types/              # TypeScript type definitions
└── lib/                # Utility functions
```

### State Management
- **AuthContext**: Manages user authentication, sessions, and role-based permissions
- **ChatContext**: Handles real-time chat state, messages, rooms, and presence
- **Component State**: Local state for UI interactions and form management

### API Integration
- **RESTful API**: HTTP client for standard CRUD operations
- **Socket.IO**: Real-time bidirectional communication
- **Session Management**: Automatic session token handling and refresh

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Style
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Code formatting (recommended)
- **Component Patterns**: Functional components with hooks

### Adding New Features

1. **Components**: Create reusable components in appropriate directories
2. **Types**: Define TypeScript interfaces in `/types`
3. **API Integration**: Add endpoints to `/services/api.ts`
4. **Real-time Features**: Extend socket events in `/services/socket.ts`
5. **State Management**: Update contexts for shared state

## 🤝 Backend Integration

### API Endpoints Used
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/logout` - Session termination
- `POST /auth/validate-session` - Session validation
- `GET /chat/rooms` - Fetch chat rooms
- `GET /chat/rooms/:id/messages` - Get room messages
- `POST /chat/rooms` - Create new room

### Socket.IO Events
- **Connection**: `connect`, `disconnect`
- **Messaging**: `sendMessage`, `receiveMessage`
- **Presence**: `userOnline`, `userOffline`, `updateStatus`
- **Typing**: `startTyping`, `stopTyping`, `userTyping`
- **Rooms**: `joinRoom`, `leaveRoom`, `roomUpdate`

## 📦 Dependencies

### Core Dependencies
- **React 18**: UI library with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Socket.IO Client**: Real-time communication
- **Axios**: HTTP client for API requests
- **date-fns**: Date manipulation and formatting

### UI Dependencies
- **shadcn/ui**: Modern React component library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Radix UI**: Headless UI primitives

### Development Dependencies
- **ESLint**: Code linting and quality checks
- **TypeScript**: Type checking and compilation
- **Vite Plugin React**: React support for Vite

## 🐛 Troubleshooting

### Common Issues

**Authentication Problems**
- Verify backend server is running
- Check API URL in environment variables
- Clear browser storage and cookies

**Real-time Features Not Working**
- Confirm Socket.IO server connection
- Check browser console for connection errors
- Verify CORS settings on backend

**Build Errors**
- Run `npm install` to update dependencies
- Check TypeScript errors with `npm run type-check`
- Verify all imports and file paths

### Debug Mode

Enable debug logging by setting in browser console:
```javascript
localStorage.setItem('debug', 'socket.io-client:*');
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review the backend API documentation

---

Built with ❤️ using React, TypeScript, and modern web technologies.
