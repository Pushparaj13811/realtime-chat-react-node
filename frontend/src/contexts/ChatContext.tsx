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
import { useAuth } from './AuthContext';
import apiService from '../services/api';
import socketService from '../services/socket';

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

      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatRoomId]: [...roomTypingUsers, action.payload]
        }
      };
    }

    case 'REMOVE_TYPING_USER': {
      const filteredUsers = (state.typingUsers[action.payload.chatRoomId] || [])
        .filter(u => u.userId !== action.payload.userId);
      
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
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { state: authState } = useAuth();

  // Setup socket event listeners
  useEffect(() => {
    if (!authState.isAuthenticated) {
      dispatch({ type: 'CLEAR_CHAT_DATA' });
      return;
    }

    // Connection events
    socketService.on('connect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
    });

    socketService.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    });

    // Message events
    socketService.on('new-message', (data) => {
      dispatch({ type: 'ADD_MESSAGE', payload: data.message });
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
      if (data.isTyping) {
        dispatch({ type: 'ADD_TYPING_USER', payload: data });
      } else {
        dispatch({ 
          type: 'REMOVE_TYPING_USER', 
          payload: { chatRoomId: data.chatRoomId, userId: data.userId } 
        });
      }
    });

    // Status events
    socketService.on('online-users', (users) => {
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    socketService.on('online-agents', (agents) => {
      dispatch({ type: 'SET_ONLINE_AGENTS', payload: agents });
    });

    // Get initial data
    if (socketService.isConnected()) {
      socketService.getOnlineUsers();
      socketService.getOnlineAgents();
    }

    return () => {
      socketService.off('connect');
      socketService.off('disconnect');
      socketService.off('new-message');
      socketService.off('message-status-updated');
      socketService.off('chat-history');
      socketService.off('user-typing');
      socketService.off('online-users');
      socketService.off('online-agents');
    };
  }, [authState.isAuthenticated]);

  // Load chat rooms when authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshChatRooms();
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
    messageType: MessageType = 'TEXT' as never, 
    replyTo?: string
  ) => {
    if (!state.currentChatRoom || !content.trim()) return;

    const messageData = {
      chatRoomId: state.currentChatRoom._id,
      content: content.trim(),
      messageType,
      replyTo,
    };

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
    socketService.sendTyping(state.currentChatRoom._id, isTyping);
  };

  const markMessageAsRead = (messageId: string) => {
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