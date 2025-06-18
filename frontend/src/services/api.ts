import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { 
  ApiResponse, 
  LoginRequest, 
  RegisterRequest, 
  AuthSession,
  ChatRoom,
  Message,
  CreateChatRoomRequest,
  User,
  UserStatus,
  ExportOptions
} from '../types';

interface AgentWorkload {
  _id: string;
  username: string;
  email: string;
  specialization?: string;
  isOnline: boolean;
  status: string;
  activeChatsCount: number;
  workloadPercentage: number;
  assignedChats: Array<{
    _id: string;
    type: string;
    status: string;
    lastActivity: string;
    metadata?: {
      subject?: string;
      priority?: string;
    };
  }>;
}

// Helper function to extract error message from axios error
function extractErrorMessage(error: unknown): string {
  // If it's an axios error with response
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string; error?: string; errors?: string[] } | string } };
    const data = axiosError.response?.data;
    
    if (data) {
      // If response has a message but wrapped differently
      if (typeof data === 'string') return data;
      
      // Try different possible error message fields for object data
      if (typeof data === 'object') {
        const errorData = data as { message?: string; error?: string; errors?: string[] };
        if (errorData.message) return errorData.message;
        if (errorData.error) return errorData.error;
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          return errorData.errors[0];
        }
      }
    }
  }
  
  // If it's a network error
  if (error && typeof error === 'object' && 'message' in error) {
    const errorWithMessage = error as { message: string; code?: string };
    if (errorWithMessage.code === 'NETWORK_ERROR' || errorWithMessage.message.includes('Network Error')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (errorWithMessage.code === 'ECONNABORTED' || errorWithMessage.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return errorWithMessage.message;
  }
  
  // If it's a string error
  if (typeof error === 'string') return error;
  
  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

class ApiService {
  private api: AxiosInstance;
  private sessionId: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
      timeout: 10000,
      withCredentials: true,
    });

    // Load session from localStorage on initialization
    this.sessionId = localStorage.getItem('sessionId');

    // Request interceptor to add session ID
    this.api.interceptors.request.use((config) => {
      if (this.sessionId) {
        config.headers['x-session-id'] = this.sessionId;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Don't auto-redirect on 401 for login/register endpoints
        const isAuthEndpoint = error.config?.url?.includes('/auth/');
        
        if (error.response?.status === 401 && !isAuthEndpoint) {
          this.clearSession();
          window.location.href = '/login';
        }
        
        // Enhance error with proper message extraction
        const enhancedError = {
          ...error,
          message: extractErrorMessage(error)
        };
        
        return Promise.reject(enhancedError);
      }
    );
  }

  // Helper method to handle API calls with consistent error handling
  private async handleApiCall<T>(apiCall: () => Promise<AxiosResponse<T>>): Promise<T> {
    try {
      const response = await apiCall();
      return response.data;
    } catch (error) {
      // Re-throw with enhanced error message
      throw new Error(extractErrorMessage(error));
    }
  }

  // Session management
  setSession(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem('sessionId', sessionId);
  }

  clearSession(): void {
    this.sessionId = null;
    localStorage.removeItem('sessionId');
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthSession>> {
    const response: AxiosResponse<ApiResponse<AuthSession>> = await this.api.post('/auth/login', credentials);
    
    if (response.data.success && response.data.data?.sessionId) {
      this.setSession(response.data.data.sessionId);
    }
    
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: Partial<User> }>> {
    const response: AxiosResponse<ApiResponse<{ user: Partial<User> }>> = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/auth/logout', {
      sessionId: this.sessionId
    });
    this.clearSession();
    return response.data;
  }

  async validateSession(): Promise<ApiResponse<AuthSession>> {
    const response: AxiosResponse<ApiResponse<AuthSession>> = await this.api.post('/auth/validate-session', {
      sessionId: this.sessionId
    });
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<AuthSession>> {
    const response: AxiosResponse<ApiResponse<AuthSession>> = await this.api.get('/auth/profile');
    return response.data;
  }

  async updateStatus(status: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.put('/auth/status', { status });
    return response.data;
  }

  async getOnlineAgents(): Promise<ApiResponse<User[]>> {
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/chat/online-agents');
    return response.data;
  }

  // Chat endpoints
  async createChatRoom(roomData: CreateChatRoomRequest): Promise<ApiResponse<ChatRoom>> {
    const response: AxiosResponse<ApiResponse<ChatRoom>> = await this.api.post('/chat/rooms', roomData);
    return response.data;
  }

  async getChatRooms(): Promise<ApiResponse<ChatRoom[]>> {
    const response: AxiosResponse<ApiResponse<ChatRoom[]>> = await this.api.get('/chat/rooms');
    return response.data;
  }

  // Admin: Get all chat rooms (not limited to user participation)
  async getAllChatRoomsAdmin(): Promise<ApiResponse<ChatRoom[]>> {
    const response: AxiosResponse<ApiResponse<ChatRoom[]>> = await this.api.get('/admin/chat-rooms');
    return response.data;
  }

  async getAgentChatRooms(status?: string): Promise<ApiResponse<ChatRoom[]>> {
    const params = status ? { status } : {};
    const response: AxiosResponse<ApiResponse<ChatRoom[]>> = await this.api.get('/chat/rooms/agent', { params });
    return response.data;
  }

  async getChatRoom(chatRoomId: string): Promise<ApiResponse<ChatRoom>> {
    const response: AxiosResponse<ApiResponse<ChatRoom>> = await this.api.get(`/chat/rooms/${chatRoomId}`);
    return response.data;
  }

  async getMessages(chatRoomId: string, limit = 50, offset = 0): Promise<ApiResponse<Message[]>> {
    const response: AxiosResponse<ApiResponse<Message[]>> = await this.api.get(
      `/chat/rooms/${chatRoomId}/messages?limit=${limit}&offset=${offset}`
    );
    return response.data;
  }

  async searchMessages(chatRoomId: string, query: string, options?: {
    messageType?: string;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<ApiResponse<Message[]>> {
    const params = {
      query,
      ...options,
      ...(options?.dateRange && {
        startDate: options.dateRange.start.toISOString(),
        endDate: options.dateRange.end.toISOString()
      })
    };
    
    const response: AxiosResponse<ApiResponse<Message[]>> = await this.api.get(`/chat/rooms/${chatRoomId}/search`, { params });
    return response.data;
  }

  async closeChatRoom(chatRoomId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(`/chat/rooms/${chatRoomId}`);
    return response.data;
  }

  async assignAgent(chatRoomId: string, agentId?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/chat/assign-agent', {
      chatRoomId,
      agentId
    });
    return response.data;
  }

  async transferChat(chatRoomId: string, fromAgentId: string, toAgentId: string, reason?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/chat/transfer', {
      chatRoomId,
      fromAgentId,
      toAgentId,
      reason
    });
    return response.data;
  }

  async getUnreadCount(): Promise<ApiResponse<{ [chatRoomId: string]: number }>> {
    const response: AxiosResponse<ApiResponse<{ [chatRoomId: string]: number }>> = await this.api.get('/chat/unread-count');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get('/health');
    return response.data;
  }

  // Admin endpoints
  async getAdminStats(): Promise<ApiResponse<{
    totalUsers: number;
    activeAgents: number;
    activeChats: number;
    onlineUsers: number;
  }>> {
    const response: AxiosResponse<ApiResponse<{
      totalUsers: number;
      activeAgents: number;
      activeChats: number;
      onlineUsers: number;
    }>> = await this.api.get('/admin/stats');
    return response.data;
  }

  async getAllUsers(): Promise<ApiResponse<User[]>> {
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/admin/users');
    return response.data;
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.put(`/admin/users/${userId}/status`, { status });
    return response.data;
  }

  // Chat export endpoint
  async exportChatData(options: ExportOptions): Promise<ApiResponse<{ url: string }>> {
    const response: AxiosResponse<ApiResponse<{ url: string }>> = await this.api.post('/chat/export', options);
    return response.data;
  }

  // Agent workload and management endpoints
  async getAgentWorkloadStats(): Promise<ApiResponse<{
    totalChats: number;
    activeChats: number;
    avgResponseTime: number;
    completedToday: number;
  }>> {
    const response: AxiosResponse<ApiResponse<{
      totalChats: number;
      activeChats: number;
      avgResponseTime: number;
      completedToday: number;
    }>> = await this.api.get('/chat/admin/agent-workload-stats');
    return response.data;
  }

  async transferAgentBetweenChats(fromChatRoomId: string, toChatRoomId: string, agentId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/admin/transfer-agent-between-chats', {
      fromChatId: fromChatRoomId,
      toChatId: toChatRoomId,
      agentId,
      reason: 'Admin transfer between chats'
    });
    return response.data;
  }

  async removeAgentFromChat(chatRoomId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/admin/remove-agent', {
      chatRoomId,
      reason: 'Admin removal'
    });
    return response.data;
  }

  async assignAgentToChat(chatRoomId: string, agentId: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/admin/assign-agent', {
      chatRoomId,
      agentId,
      reason: 'Admin assignment'
    });
    return response.data;
  }

  // Chat room statistics
  async getChatRoomStats(): Promise<ApiResponse<{
    totalRooms: number;
    activeRooms: number;
    avgMessagesPerRoom: number;
    totalMessages: number;
    roomsByType: Record<string, number>;
    roomsByStatus: Record<string, number>;
  }>> {
    const response: AxiosResponse<ApiResponse<{
      totalRooms: number;
      activeRooms: number;
      avgMessagesPerRoom: number;
      totalMessages: number;
      roomsByType: Record<string, number>;
      roomsByStatus: Record<string, number>;
    }>> = await this.api.get('/admin/chat-stats');
    return response.data;
  }

  // Admin Agent Management endpoints
  async getAgentWorkloads(): Promise<ApiResponse<AgentWorkload[]>> {
    const response: AxiosResponse<ApiResponse<AgentWorkload[]>> = await this.api.get('/admin/agent-workloads');
    return response.data;
  }

  async transferAgent(chatRoomId: string, newAgentId: string, reason?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/admin/transfer-agent', {
      chatRoomId,
      agentId: newAgentId,
      reason: reason || 'Admin transfer'
    });
    return response.data;
  }

  async assignAgentToRoom(chatRoomId: string, agentId: string, reason?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/admin/assign-agent', {
      chatRoomId,
      agentId,
      reason: reason || 'Admin assignment'
    });
    return response.data;
  }

  async removeAgentFromRoom(chatRoomId: string, reason?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/admin/remove-agent', {
      chatRoomId,
      reason: reason || 'Admin removal'
    });
    return response.data;
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService; 