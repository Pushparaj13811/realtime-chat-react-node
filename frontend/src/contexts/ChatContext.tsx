import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { 
  ChatState, 
  ChatRoom, 
  Message, 
  UserTyping, 
  SocketUser, 
  User,
  MessageType,
  CreateChatRoomRequest
} from '../types';
import { UserRole } from '../types';
import { useAuth } from './AuthContext';
import apiService from '../services/api';
import socketService from '../services/socket';
import notificationService from '../services/notification';
import { useToast } from '../components/ui/toast';

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHAT_ROOMS'; payload: ChatRoom[] }
  | { type: 'ADD_CHAT_ROOM'; payload: ChatRoom }
  | { type: 'UPDATE_CHAT_ROOM'; payload: ChatRoom }
  | { type: 'SET_CURRENT_CHAT_ROOM'; payload: ChatRoom | null }
  | { type: 'SET_MESSAGES'; payload: { chatRoomId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { messageId: string; status: string; userId: string } }
  | { type: 'SET_TYPING_USERS'; payload: { chatRoomId: string; users: UserTyping[] } }
  | { type: 'ADD_TYPING_USER'; payload: UserTyping }
  | { type: 'REMOVE_TYPING_USER'; payload: { chatRoomId: string; userId: string } }
  | { type: 'SET_ONLINE_USERS'; payload: SocketUser[] }
  | { type: 'SET_ONLINE_AGENTS'; payload: User[] }
  | { type: 'SET_UNREAD_COUNT'; payload: { chatRoomId: string; count: number } }
  | { type: 'SET_ALL_UNREAD_COUNTS'; payload: { [chatRoomId: string]: number } }
  | { type: 'INCREMENT_UNREAD_COUNT'; payload: { chatRoomId: string } }
  | { type: 'DECREMENT_UNREAD_COUNT'; payload: { chatRoomId: string } }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'CLEAR_CHAT_DATA' };

const initialState: ChatState = {
  chatRooms: [],
  currentChatRoom: null,
  messages: {},
  onlineUsers: [],
  onlineAgents: [],
  typingUsers: {},
  unreadCounts: {},
  isConnected: false,
  isLoading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_CHAT_ROOMS':
      return { ...state, chatRooms: action.payload };

    case 'ADD_CHAT_ROOM':
      return { 
        ...state, 
        chatRooms: [...state.chatRooms, action.payload] 
      };

    case 'UPDATE_CHAT_ROOM':
      return {
        ...state,
        chatRooms: state.chatRooms.map(room => 
          room._id === action.payload._id ? action.payload : room
        ),
        currentChatRoom: state.currentChatRoom?._id === action.payload._id 
          ? action.payload 
          : state.currentChatRoom
      };

    case 'SET_CURRENT_CHAT_ROOM':
      return { ...state, currentChatRoom: action.payload };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatRoomId]: action.payload.messages
        }
      };

    case 'ADD_MESSAGE': {
      const chatRoomId = action.payload.chatRoomId;
      const existingMessages = state.messages[chatRoomId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatRoomId]: [...existingMessages, action.payload]
        }
      };
    }

    case 'UPDATE_MESSAGE_STATUS': {
      const updatedMessages = { ...state.messages };
      Object.keys(updatedMessages).forEach(roomId => {
        updatedMessages[roomId] = updatedMessages[roomId].map(message => {
          if (message._id === action.payload.messageId) {
            return { ...message, status: action.payload.status as never };
          }
          return message;
        });
      });
      return { ...state, messages: updatedMessages };
    }

    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatRoomId]: action.payload.users
        }
      };

    case 'ADD_TYPING_USER': {
      const roomTypingUsers = state.typingUsers[action.payload.chatRoomId] || [];
      const existingUser = roomTypingUsers.find(u => u.userId === action.payload.userId);
      
      console.log('⌨️ Reducer: ADD_TYPING_USER:', {
        chatRoomId: action.payload.chatRoomId,
        userId: action.payload.userId,
        username: action.payload.username,
        existingUser: !!existingUser,
        currentTypingUsers: roomTypingUsers.map(u => u.username)
      });
      
      if (existingUser) {
        return {
          ...state,
          typingUsers: {
            ...state.typingUsers,
            [action.payload.chatRoomId]: roomTypingUsers.map(u => 
              u.userId === action.payload.userId ? action.payload : u
            )
          }
        };
      }

      const newTypingUsers = [...roomTypingUsers, action.payload];
      console.log('⌨️ Reducer: New typing users list:', newTypingUsers.map(u => u.username));
      
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatRoomId]: newTypingUsers
        }
      };
    }

    case 'REMOVE_TYPING_USER': {
      const currentTypingUsers = state.typingUsers[action.payload.chatRoomId] || [];
      const filteredUsers = currentTypingUsers.filter(u => u.userId !== action.payload.userId);
      
      console.log('⌨️ Reducer: REMOVE_TYPING_USER:', {
        chatRoomId: action.payload.chatRoomId,
        userId: action.payload.userId,
        before: currentTypingUsers.map(u => u.username),
        after: filteredUsers.map(u => u.username)
      });
      
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatRoomId]: filteredUsers
        }
      };
    }

    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };

    case 'SET_ONLINE_AGENTS':
      return { ...state, onlineAgents: action.payload };

    case 'SET_UNREAD_COUNT':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.chatRoomId]: action.payload.count
        }
      };

    case 'SET_ALL_UNREAD_COUNTS':
      return {
        ...state,
        unreadCounts: action.payload
      };

    case 'INCREMENT_UNREAD_COUNT': {
      const currentCount = state.unreadCounts[action.payload.chatRoomId] || 0;
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.chatRoomId]: currentCount + 1
        }
      };
    }

    case 'DECREMENT_UNREAD_COUNT': {
      const currentCount = state.unreadCounts[action.payload.chatRoomId] || 0;
      const newCount = Math.max(0, currentCount - 1);
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.chatRoomId]: newCount
        }
      };
    }

    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };

    case 'CLEAR_CHAT_DATA':
      return initialState;

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  createChatRoom: (roomData: CreateChatRoomRequest) => Promise<void>;
  joinChatRoom: (chatRoomId: string) => Promise<void>;
  leaveChatRoom: (chatRoomId: string) => void;
  sendMessage: (content: string, messageType?: MessageType, replyTo?: string) => void;
  loadChatHistory: (chatRoomId: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  markMessageAsRead: (messageId: string) => void;
  refreshChatRooms: () => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { state: authState } = useAuth();
  const { addToast } = useToast();

  // Setup socket event listeners
  useEffect(() => {
    if (!authState.isAuthenticated) {
      console.log('ChatContext: Not authenticated, clearing chat data');
      dispatch({ type: 'CLEAR_CHAT_DATA' });
      return;
    }

    console.log('ChatContext: Setting up socket event listeners for authenticated user');

    // Connection events
    socketService.on('connect', () => {
      console.log('ChatContext: Socket connected successfully');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      // Request fresh online data when connected
      setTimeout(() => {
        console.log('ChatContext: Refreshing online data after connection');
        socketService.getOnlineUsers();
        socketService.getOnlineAgents();
        // Also refresh chat rooms to get updated participant status
        refreshChatRooms();
      }, 1000); // Small delay to ensure server is ready
    });

    socketService.on('connect_error', (error) => {
      console.error('ChatContext: Socket connection error:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    });

    socketService.on('disconnect', () => {
      console.log('ChatContext: Socket disconnected');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      // Clear online users when disconnected
      dispatch({ type: 'SET_ONLINE_USERS', payload: [] });
      dispatch({ type: 'SET_ONLINE_AGENTS', payload: [] });
    });

    socketService.on('error', (error) => {
      console.error('ChatContext: Socket error:', error);
      // If authentication error, we might need to re-authenticate
      if (error.message?.includes('Authentication error')) {
        console.log('ChatContext: Authentication error detected, may need to re-login');
      }
    });

    // Message events
    socketService.on('new-message', (data) => {
      dispatch({ type: 'ADD_MESSAGE', payload: data.message });
      
      // Handle notifications for inactive users
      const isMessageFromCurrentUser = data.sender.id === authState.user?.userId;
      const currentUserId = authState.user?.userId;
      
      if (!isMessageFromCurrentUser && currentUserId) {
        // Check if the current user is a participant in this chat room
        const chatRoom = state.chatRooms.find(room => room._id === data.message.chatRoomId);
        
        if (chatRoom) {
          const isParticipant = chatRoom.participants.some(p => p._id === currentUserId);
          const isAssignedAgent = chatRoom.assignedAgent?._id === currentUserId;
          
          // Only increment unread count if user is actually involved in this chat
          if (isParticipant || isAssignedAgent) {
            // Don't increment for admins as per privacy requirements
            if (authState.user?.role !== 'admin') {
              dispatch({ type: 'INCREMENT_UNREAD_COUNT', payload: { chatRoomId: data.message.chatRoomId } });
            }
            
            if (data.message.chatRoomId !== state.currentChatRoom?._id) {
              // User is not viewing this chat room - show notification
              notificationService.showNewMessageNotification(
                data.sender.username,
                data.message.content,
                chatRoom.name
              );
            }
            
            // Mark message as delivered immediately when received
            socketService.markMessageDelivered(data.message._id);
          }
        }
      }
    });

    socketService.on('message-status-updated', (data) => {
      dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: data });
    });

    socketService.on('chat-history', (data) => {
      dispatch({ 
        type: 'SET_MESSAGES', 
        payload: { 
          chatRoomId: data.chatRoomId, 
          messages: data.messages 
        } 
      });
    });

    // Typing events
    socketService.on('user-typing', (data) => {
      console.log('⌨️ ChatContext: Received typing event:', data);
      if (data.isTyping) {
        console.log('⌨️ ChatContext: Adding typing user:', data.userId);
        dispatch({ type: 'ADD_TYPING_USER', payload: data });
      } else {
        console.log('⌨️ ChatContext: Removing typing user:', data.userId);
        dispatch({ 
          type: 'REMOVE_TYPING_USER', 
          payload: { 
            chatRoomId: data.chatRoomId, 
            userId: data.userId 
          } 
        });
      }
    });

    // Online status events
    socketService.on('online-users', (users) => {
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    socketService.on('online-agents', (agents) => {
      dispatch({ type: 'SET_ONLINE_AGENTS', payload: agents });
    });

    socketService.on('user-status-changed', () => {
      // Refresh online users when status changes
      setTimeout(() => {
        socketService.getOnlineUsers();
        socketService.getOnlineAgents();
      }, 500);
    });

    // Agent assignment events
    socketService.on('agent-removed', (data) => {
      console.log('🚨 ChatContext: Agent removed from chat room:', data);
      // Refresh chat rooms to update the UI
      refreshChatRooms();
      
      // If this affects the current chat room, notify user
      if (state.currentChatRoom?._id === data.chatRoomId) {
        console.log('⚠️ Current chat room affected by agent removal');
      }
    });

    socketService.on('agent-assignment-removed', (data) => {
      console.log('🚨 ChatContext: Agent assignment removed for current user:', data);
      
      // If this is the current chat room, leave it immediately
      if (state.currentChatRoom?._id === data.chatRoomId) {
        dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: null });
      }
      
      // Show persistent toast notification
      const chatRoomShortId = data.chatRoomId.slice(-6);
      addToast({
        type: 'error',
        title: 'Agent Assignment Removed',
        message: `You have been removed from Support Chat #${chatRoomShortId}. Reason: ${data.reason}`,
        duration: 10000, // 10 seconds
        persistent: false
      });
      
      // Refresh chat rooms to update the UI
      setTimeout(() => {
        refreshChatRooms();
      }, 500);
    });

    socketService.on('agent-assignment-received', (data) => {
      console.log('✅ ChatContext: Agent assignment received:', data);
      
      // Show success notification for new assignment
      addToast({
        type: 'success',
        title: 'New Chat Assignment',
        message: `You have been assigned to a new support chat room.`,
        duration: 5000
      });
      
      // Refresh chat rooms to show new assignment
      refreshChatRooms();
    });

    // Listen for general room updates that affect all users/admins
    socketService.on('chat-room-updated', (data) => {
      console.log('🔄 ChatContext: Chat room updated:', data);
      
      // Update specific chat room in state immediately for faster UI updates
      if (data.chatRoom) {
        dispatch({ type: 'UPDATE_CHAT_ROOM', payload: data.chatRoom as ChatRoom });
        
        // Check if the current user is newly assigned as agent
        const currentUserId = authState.user?.userId;
        const chatRoom = data.chatRoom as ChatRoom;
        const assignedAgentId = chatRoom.assignedAgent?._id;
        
        if (data.action === 'agent-assigned' && assignedAgentId === currentUserId) {
          console.log('✅ ChatContext: Current user assigned to new chat room:', chatRoom._id);
          addToast({
            type: 'success',
            title: 'New Chat Assignment',
            message: `You have been assigned to chat room #${chatRoom._id.slice(-6)}`,
            duration: 5000
          });
          
          // Join the socket room immediately
          socketService.joinRoom(chatRoom._id);
        }
        
        // Check if current user was removed as agent
        if (data.action === 'agent-removed' && state.currentChatRoom?._id === chatRoom._id) {
          const isCurrentUserAssigned = chatRoom.assignedAgent?._id === currentUserId;
          if (!isCurrentUserAssigned && authState.user?.role === UserRole.AGENT) {
            console.log('🚨 ChatContext: Current user removed from current chat room');
            dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: null });
            addToast({
              type: 'warning',
              title: 'Chat Assignment Removed',
              message: `You have been removed from chat room #${chatRoom._id.slice(-6)}`,
              duration: 5000
            });
          }
        }
      }
      
      // Refresh all chat rooms to ensure consistency and show new rooms
      setTimeout(() => {
        refreshChatRooms();
      }, 500);
    });

    // Periodic refresh of online users (every 30 seconds)
    const refreshInterval = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.getOnlineUsers();
        socketService.getOnlineAgents();
      }
    }, 30000);

    // Initial data fetch
    if (socketService.isConnected()) {
      refreshChatRooms();
      refreshUnreadCounts();
      socketService.getOnlineUsers();
      socketService.getOnlineAgents();
    }

    // Cleanup on unmount
    return () => {
      clearInterval(refreshInterval);
      socketService.off('connect');
      socketService.off('disconnect');
      socketService.off('new-message');
      socketService.off('message-status-updated');
      socketService.off('chat-history');
      socketService.off('user-typing');
      socketService.off('online-users');
      socketService.off('online-agents');
      socketService.off('user-status-changed');
      socketService.off('agent-removed');
      socketService.off('agent-assignment-removed');
      socketService.off('agent-assignment-received');
      socketService.off('chat-room-updated');
    };
  }, [authState.isAuthenticated]);

  // Load chat rooms when authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshChatRooms();
      refreshUnreadCounts();
    }
  }, [authState.isAuthenticated]);

  const createChatRoom = async (roomData: CreateChatRoomRequest) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.createChatRoom(roomData);
      
      if (response.success && response.data) {
        dispatch({ type: 'ADD_CHAT_ROOM', payload: response.data });
        dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message });
      }
    } catch (error) {
      console.error('Create chat room error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to create chat room' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const joinChatRoom = async (chatRoomId: string) => {
    try {
      // Find the chat room in our state
      const chatRoom = state.chatRooms.find(room => room._id === chatRoomId);
      
      if (chatRoom) {
        dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: chatRoom });
        
        // Join the room via socket
        socketService.joinRoom(chatRoomId);
        
        // Load messages if not already loaded
        if (!state.messages[chatRoomId]) {
          await loadChatHistory(chatRoomId);
        }
      } else {
        // Fetch the chat room if not in state
        const response = await apiService.getChatRoom(chatRoomId);
        if (response.success && response.data) {
          dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: response.data });
          socketService.joinRoom(chatRoomId);
          await loadChatHistory(chatRoomId);
        }
      }
    } catch (error) {
      console.error('Join chat room error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to join chat room' 
      });
    }
  };

  const leaveChatRoom = (chatRoomId: string) => {
    socketService.leaveRoom(chatRoomId);
    if (state.currentChatRoom?._id === chatRoomId) {
      dispatch({ type: 'SET_CURRENT_CHAT_ROOM', payload: null });
    }
  };

  const sendMessage = (
    content: string, 
    messageType: MessageType = 'text', 
    replyTo?: string
  ) => {
    if (!state.currentChatRoom || !content.trim()) return;

    const messageData = {
      chatRoomId: state.currentChatRoom._id,
      content: content.trim(),
      messageType,
      replyTo,
    };

    console.log('ChatContext: Sending message:', messageData);
    socketService.sendMessage(messageData);
  };

  const loadChatHistory = async (chatRoomId: string) => {
    try {
      const response = await apiService.getMessages(chatRoomId);
      
      if (response.success && response.data) {
        dispatch({ 
          type: 'SET_MESSAGES', 
          payload: { 
            chatRoomId, 
            messages: response.data 
          } 
        });
      }
    } catch (error) {
      console.error('Load chat history error:', error);
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (!state.currentChatRoom) return;
    console.log('⌨️ ChatContext: Sending typing indicator:', { 
      chatRoomId: state.currentChatRoom._id, 
      isTyping,
      user: authState.user?.username 
    });
    socketService.sendTyping(state.currentChatRoom._id, isTyping);
  };

  const markMessageAsRead = (messageId: string) => {
    if (state.currentChatRoom) {
      // Decrement unread count for current chat room
      dispatch({ type: 'DECREMENT_UNREAD_COUNT', payload: { chatRoomId: state.currentChatRoom._id } });
    }
    socketService.markMessageRead(messageId);
  };

  const refreshChatRooms = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.getChatRooms();
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_CHAT_ROOMS', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message });
      }
    } catch (error) {
      console.error('Refresh chat rooms error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load chat rooms' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const refreshUnreadCounts = async () => {
    try {
      if (!authState.isAuthenticated) return;

      const response = await apiService.getUnreadCount();
      if (response.success && response.data) {
        const data = response.data as { total?: number; perRoom?: { [key: string]: number } };
        const perRoom = data.perRoom || {};
        
        // Update all unread counts in the state
        dispatch({ type: 'SET_ALL_UNREAD_COUNTS', payload: perRoom });
        
        console.log('✅ Unread counts refreshed:', perRoom);
      }
    } catch (error) {
      console.error('Failed to refresh unread counts:', error);
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  return (
    <ChatContext.Provider
      value={{
        state,
        createChatRoom,
        joinChatRoom,
        leaveChatRoom,
        sendMessage,
        loadChatHistory,
        sendTyping,
        markMessageAsRead,
        refreshChatRooms,
        refreshUnreadCounts,
        clearError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext; 