import { DatabaseConfig } from '../config/database.js';
import type { IMessage, IChatRoom } from '../interfaces/index.js';
import type { 
  ICacheService, 
  CachedMessage, 
  CachedChatRoom, 
  AgentStatus 
} from '../interfaces/services.interfaces.js';

export class CacheService implements ICacheService {
  private static instance: CacheService;
  private redisClient: any;

  private constructor() {
    this.redisClient = DatabaseConfig.getRedisClient();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Cache key generators
  private getChatHistoryKey(chatRoomId: string): string {
    return `chat:history:${chatRoomId}`;
  }

  private getChatRoomKey(chatRoomId: string): string {
    return `chat:room:${chatRoomId}`;
  }

  private getUserChatsKey(userId: string): string {
    return `user:chats:${userId}`;
  }

  private getOnlineUsersKey(): string {
    return 'users:online';
  }

  private getAgentStatusKey(agentId: string): string {
    return `agent:status:${agentId}`;
  }

  // Message caching methods
  async cacheMessage(message: IMessage): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cachedMessage: CachedMessage = {
        id: this.extractId(message._id) || this.extractId(message.id) || '',
        chatRoomId: this.extractId(message.chatRoomId) || '',
        senderId: this.extractId(message.senderId) || '',
        content: message.content,
        messageType: message.messageType,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
        metadata: message.metadata
      };

      const key = this.getChatHistoryKey(cachedMessage.chatRoomId);
      
      // Add message to sorted set with timestamp as score
      await this.redisClient.zAdd(key, {
        score: message.createdAt.getTime(),
        value: JSON.stringify(cachedMessage)
      });

      // Keep only last 100 messages per chat
      await this.redisClient.zRemRangeByRank(key, 0, -101);
      
      // Set expiration for 24 hours
      await this.redisClient.expire(key, 86400);
    } catch (error) {
      console.error('Error caching message:', error);
    }
  }

  async getCachedMessages(chatRoomId: string, limit: number = 50, offset: number = 0): Promise<CachedMessage[]> {
    if (!this.redisClient) return [];

    try {
      const key = this.getChatHistoryKey(chatRoomId);
      
      // Get messages in descending order (newest first)
      const messages = await this.redisClient.zRevRange(key, offset, offset + limit - 1);
      
      return messages.map((msg: string) => JSON.parse(msg));
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return [];
    }
  }

  async getRecentMessages(chatRoomId: string, count: number = 20): Promise<CachedMessage[]> {
    if (!this.redisClient) return [];

    try {
      const key = this.getChatHistoryKey(chatRoomId);
      const messages = await this.redisClient.zRevRange(key, 0, count - 1);
      
      return messages.map((msg: string) => JSON.parse(msg));
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  // Chat room caching methods
  async cacheChatRoom(chatRoom: IChatRoom): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cachedRoom: CachedChatRoom = {
        id: this.extractId(chatRoom._id) || this.extractId(chatRoom.id) || '',
        participants: chatRoom.participants.map(p => this.extractId(p) || '').filter(Boolean),
        assignedAgent: this.extractId(chatRoom.assignedAgent),
        lastActivity: chatRoom.lastActivity.toISOString(),
        status: chatRoom.status
      };

      const key = this.getChatRoomKey(cachedRoom.id);
      await this.redisClient.setEx(key, 3600, JSON.stringify(cachedRoom)); // 1 hour expiration
    } catch (error) {
      console.error('Error caching chat room:', error);
    }
  }

  async getCachedChatRoom(chatRoomId: string): Promise<CachedChatRoom | null> {
    if (!this.redisClient) return null;

    try {
      const key = this.getChatRoomKey(chatRoomId);
      const cachedRoom = await this.redisClient.get(key);
      
      return cachedRoom ? JSON.parse(cachedRoom) : null;
    } catch (error) {
      console.error('Error getting cached chat room:', error);
      return null;
    }
  }

  // User online status methods
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      const onlineKey = this.getOnlineUsersKey();
      await this.redisClient.hSet(onlineKey, userId, socketId);
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  async setUserOffline(userId: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      const onlineKey = this.getOnlineUsersKey();
      await this.redisClient.hDel(onlineKey, userId);
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  async getOnlineUsers(): Promise<string[]> {
    if (!this.redisClient) return [];

    try {
      const onlineKey = this.getOnlineUsersKey();
      return await this.redisClient.hKeys(onlineKey);
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  async getUserSocketId(userId: string): Promise<string | null> {
    if (!this.redisClient) return null;

    try {
      const onlineKey = this.getOnlineUsersKey();
      return await this.redisClient.hGet(onlineKey, userId);
    } catch (error) {
      console.error('Error getting user socket ID:', error);
      return null;
    }
  }

  // Agent status methods
  async setAgentStatus(agentId: string, status: string, maxChats: number = 5): Promise<void> {
    if (!this.redisClient) return;

    try {
      const statusData: AgentStatus = {
        status,
        maxChats,
        currentChats: 0,
        lastUpdated: new Date().toISOString()
      };

      const key = this.getAgentStatusKey(agentId);
      await this.redisClient.setEx(key, 3600, JSON.stringify(statusData));
    } catch (error) {
      console.error('Error setting agent status:', error);
    }
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
    if (!this.redisClient) return null;

    try {
      const key = this.getAgentStatusKey(agentId);
      const status = await this.redisClient.get(key);
      
      return status ? JSON.parse(status) : null;
    } catch (error) {
      console.error('Error getting agent status:', error);
      return null;
    }
  }

  // User chat rooms caching
  async cacheUserChats(userId: string, chatRoomIds: string[]): Promise<void> {
    if (!this.redisClient) return;

    try {
      const key = this.getUserChatsKey(userId);
      await this.redisClient.setEx(key, 1800, JSON.stringify(chatRoomIds)); // 30 minutes
    } catch (error) {
      console.error('Error caching user chats:', error);
    }
  }

  async getUserCachedChats(userId: string): Promise<string[]> {
    if (!this.redisClient) return [];

    try {
      const key = this.getUserChatsKey(userId);
      const chats = await this.redisClient.get(key);
      
      return chats ? JSON.parse(chats) : [];
    } catch (error) {
      console.error('Error getting user cached chats:', error);
      return [];
    }
  }

  // Cache cleanup methods
  async clearChatHistory(chatRoomId: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      const key = this.getChatHistoryKey(chatRoomId);
      await this.redisClient.del(key);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }

  async clearUserCache(userId: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      const userChatsKey = this.getUserChatsKey(userId);
      await this.redisClient.del(userChatsKey);
      await this.setUserOffline(userId);
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  // Utility method to safely extract ID from MongoDB ObjectId or string
  private extractId(id: any): string | undefined {
    if (!id) return undefined;
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id.toString) return id.toString();
    return undefined;
  }
}

// Export interfaces for use in other files
export type { CachedMessage, CachedChatRoom, AgentStatus } from '../interfaces/services.interfaces.js'; 