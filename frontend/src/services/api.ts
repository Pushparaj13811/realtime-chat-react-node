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
  UserStatus
} from '../types';

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  department: string;
  problemType: string;
  priority: string;
  status: string;
  createdBy: string;
  assignedAgent?: string;
  assignedBy?: string;
  chatRoom?: string;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private api: AxiosInstance;
  private sessionId: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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
        if (error.response?.status === 401) {
          this.clearSession();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
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
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/auth/agents/online');
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

  async getAgentChatRooms(): Promise<ApiResponse<ChatRoom[]>> {
    const response: AxiosResponse<ApiResponse<ChatRoom[]>> = await this.api.get('/chat/rooms/agent');
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

  async searchMessages(chatRoomId: string, query: string): Promise<ApiResponse<Message[]>> {
    const response: AxiosResponse<ApiResponse<Message[]>> = await this.api.get(
      `/chat/rooms/${chatRoomId}/search?q=${encodeURIComponent(query)}`
    );
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

  async transferChat(chatRoomId: string, toAgentId: string, reason?: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/chat/transfer', {
      chatRoomId,
      toAgentId,
      reason
    });
    return response.data;
  }

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response: AxiosResponse<ApiResponse<{ count: number }>> = await this.api.get('/chat/unread-count');
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

  // Support Ticket endpoints
  async createSupportTicket(ticketData: {
    title: string;
    description: string;
    department: string;
    problemType: string;
    priority?: string;
  }): Promise<ApiResponse<SupportTicket>> {
    const response: AxiosResponse<ApiResponse<SupportTicket>> = await this.api.post('/support-tickets/create', ticketData);
    return response.data;
  }

  async getMyTickets(): Promise<ApiResponse<SupportTicket[]>> {
    const response: AxiosResponse<ApiResponse<SupportTicket[]>> = await this.api.get('/support-tickets/my-tickets');
    return response.data;
  }

  async getTicket(ticketId: string): Promise<ApiResponse<SupportTicket>> {
    const response: AxiosResponse<ApiResponse<SupportTicket>> = await this.api.get(`/support-tickets/${ticketId}`);
    return response.data;
  }

  async getAgentTickets(): Promise<ApiResponse<SupportTicket[]>> {
    const response: AxiosResponse<ApiResponse<SupportTicket[]>> = await this.api.get('/support-tickets/agent/assigned');
    return response.data;
  }

  async getAdminTickets(filters?: {
    status?: string;
    department?: string;
    priority?: string;
    assignedAgent?: string;
  }): Promise<ApiResponse<SupportTicket[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignedAgent) params.append('assignedAgent', filters.assignedAgent);
    
    const queryString = params.toString();
    const url = queryString ? `/support-tickets/admin/all?${queryString}` : '/support-tickets/admin/all';
    
    const response: AxiosResponse<ApiResponse<SupportTicket[]>> = await this.api.get(url);
    return response.data;
  }

  async assignTicket(ticketId: string, agentId: string): Promise<ApiResponse<{ ticket: SupportTicket; chatRoom: ChatRoom }>> {
    const response: AxiosResponse<ApiResponse<{ ticket: SupportTicket; chatRoom: ChatRoom }>> = await this.api.post('/support-tickets/assign', {
      ticketId,
      agentId
    });
    return response.data;
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<ApiResponse<SupportTicket>> {
    const response: AxiosResponse<ApiResponse<SupportTicket>> = await this.api.patch(`/support-tickets/${ticketId}/status`, {
      status
    });
    return response.data;
  }

  async getTicketStats(): Promise<ApiResponse<Record<string, unknown>>> {
    const response: AxiosResponse<ApiResponse<Record<string, unknown>>> = await this.api.get('/support-tickets/admin/stats');
    return response.data;
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService; 