import { Message, MessageStatus, MessageType } from '../models/Message.js';
import type { IMessage } from '../models/Message.js';
import { ChatRoom } from '../models/ChatRoom.js';
import type { IChatRoom } from '../models/ChatRoom.js';
import { CacheService } from './CacheService.js';
import mongoose from 'mongoose';

export interface CreateMessageData {
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType?: MessageType;
  receiverId?: string;
  replyTo?: string;
  metadata?: any;
}

export interface MessageQuery {
  chatRoomId: string;
  page?: number;
  limit?: number;
  before?: Date;
  after?: Date;
}

export class MessageService {
  private static instance: MessageService;
  private cacheService: CacheService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  // Create a new message
  async createMessage(messageData: CreateMessageData): Promise<IMessage | null> {
    try {
      // Validate chat room exists and user is participant
      const chatRoom = await ChatRoom.findById(messageData.chatRoomId);
      if (!chatRoom) {
        throw new Error('Chat room not found');
      }

      if (!chatRoom.participants.includes(new mongoose.Types.ObjectId(messageData.senderId))) {
        throw new Error('User is not a participant in this chat room');
      }

      // Create message
      const message = new Message({
        chatRoomId: messageData.chatRoomId,
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        content: messageData.content,
        messageType: messageData.messageType || MessageType.TEXT,
        status: MessageStatus.SENT,
        replyTo: messageData.replyTo,
        metadata: messageData.metadata
      });

      await message.save();

      // Update chat room's last message and activity
      await ChatRoom.findByIdAndUpdate(messageData.chatRoomId, {
        lastMessage: message._id,
        lastActivity: new Date()
      });

      // Cache the message
      await this.cacheService.cacheMessage(message);

      // Populate sender info for response
      await message.populate('senderId', 'username email role');

      return message;
    } catch (error) {
      console.error('Create message error:', error);
      return null;
    }
  }

  // Get messages for a chat room
  async getMessages(query: MessageQuery): Promise<IMessage[]> {
    try {
      const { chatRoomId, page = 1, limit = 50, before, after } = query;

      // Try to get from cache first
      const cachedMessages = await this.cacheService.getCachedMessages(
        chatRoomId,
        limit,
        (page - 1) * limit
      );

      if (cachedMessages.length > 0) {
        // Convert cached messages to full message objects if needed
        return this.convertCachedToMessages(cachedMessages);
      }

      // Build query
      const mongoQuery: any = { chatRoomId };

      if (before || after) {
        mongoQuery.createdAt = {};
        if (before) mongoQuery.createdAt.$lt = before;
        if (after) mongoQuery.createdAt.$gt = after;
      }

      // Get from database (sort by createdAt ascending for chronological order)
      const messages = await Message.find(mongoQuery)
        .populate('senderId', 'username email role')
        .populate('receiverId', 'username email role')
        .populate('replyTo')
        .sort({ createdAt: 1 })
        .limit(limit)
        .skip((page - 1) * limit);

      // Cache the messages
      for (const message of messages) {
        await this.cacheService.cacheMessage(message);
      }

      return messages;
    } catch (error) {
      console.error('Get messages error:', error);
      return [];
    }
  }

  // Update message delivery status
  async markAsDelivered(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return false;
      }

      // Check if already marked as delivered by this user
      const alreadyDelivered = message.deliveredTo.some(
        delivery => delivery.userId.toString() === userId
      );

      if (!alreadyDelivered) {
        message.deliveredTo.push({
          userId: new mongoose.Types.ObjectId(userId),
          deliveredAt: new Date()
        });

        // Update status if this is the first delivery
        if (message.status === MessageStatus.SENT) {
          message.status = MessageStatus.DELIVERED;
        }

        await message.save();

        // Update cache
        await this.cacheService.cacheMessage(message);
      }

      return true;
    } catch (error) {
      console.error('Mark as delivered error:', error);
      return false;
    }
  }

  // Update message read status
  async markAsRead(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return false;
      }

      // Check if already marked as read by this user
      const alreadyRead = message.readBy.some(
        read => read.userId.toString() === userId
      );

      if (!alreadyRead) {
        message.readBy.push({
          userId: new mongoose.Types.ObjectId(userId),
          readAt: new Date()
        });

        message.status = MessageStatus.READ;
        await message.save();

        // Update cache
        await this.cacheService.cacheMessage(message);
      }

      return true;
    } catch (error) {
      console.error('Mark as read error:', error);
      return false;
    }
  }

  // Mark multiple messages as read
  async markMultipleAsRead(messageIds: string[], userId: string): Promise<number> {
    try {
      let updatedCount = 0;

      for (const messageId of messageIds) {
        const success = await this.markAsRead(messageId, userId);
        if (success) updatedCount++;
      }

      return updatedCount;
    } catch (error) {
      console.error('Mark multiple as read error:', error);
      return 0;
    }
  }

  // Get unread message count for a user
  async getUnreadCount(userId: string, chatRoomId?: string): Promise<number> {
    try {
      const query: any = {
        'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
        senderId: { $ne: new mongoose.Types.ObjectId(userId) }
      };

      if (chatRoomId) {
        query.chatRoomId = chatRoomId;
      }

      return await Message.countDocuments(query);
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  // Get message statistics
  async getMessageStats(chatRoomId: string): Promise<any> {
    try {
      const stats = await Message.aggregate([
        { $match: { chatRoomId: new mongoose.Types.ObjectId(chatRoomId) } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            sentCount: {
              $sum: { $cond: [{ $eq: ['$status', MessageStatus.SENT] }, 1, 0] }
            },
            deliveredCount: {
              $sum: { $cond: [{ $eq: ['$status', MessageStatus.DELIVERED] }, 1, 0] }
            },
            readCount: {
              $sum: { $cond: [{ $eq: ['$status', MessageStatus.READ] }, 1, 0] }
            },
            messageTypes: {
              $push: '$messageType'
            }
          }
        }
      ]);

      return stats[0] || {
        totalMessages: 0,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        messageTypes: []
      };
    } catch (error) {
      console.error('Get message stats error:', error);
      return null;
    }
  }

  // Search messages
  async searchMessages(chatRoomId: string, searchTerm: string, limit: number = 20): Promise<IMessage[]> {
    try {
      return await Message.find({
        chatRoomId,
        content: { $regex: searchTerm, $options: 'i' }
      })
        .populate('senderId', 'username email role')
        .sort({ createdAt: 1 })
        .limit(limit);
    } catch (error) {
      console.error('Search messages error:', error);
      return [];
    }
  }

  // Delete message (soft delete)
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return false;
      }

      // Only sender can delete their message
      if (message.senderId.toString() !== userId) {
        return false;
      }

      // Soft delete by updating content
      message.content = 'This message was deleted';
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      // Update cache
      await this.cacheService.cacheMessage(message);

      return true;
    } catch (error) {
      console.error('Delete message error:', error);
      return false;
    }
  }

  // Edit message
  async editMessage(messageId: string, userId: string, newContent: string): Promise<IMessage | null> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return null;
      }

      // Only sender can edit their message
      if (message.senderId.toString() !== userId) {
        return null;
      }

      message.content = newContent;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      // Update cache
      await this.cacheService.cacheMessage(message);

      return message;
    } catch (error) {
      console.error('Edit message error:', error);
      return null;
    }
  }

  // Helper method to convert cached messages to full message objects
  private async convertCachedToMessages(cachedMessages: any[]): Promise<IMessage[]> {
    // For now, return empty array - in production, you might want to 
    // fetch additional data from database if needed
    return [];
  }
} 