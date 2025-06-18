import { Message, MessageStatus, MessageType } from '../models/Message.js';
import type { IMessage } from '../models/Message.js';
import { ChatRoom } from '../models/ChatRoom.js';
import { CacheService } from './CacheService.js';
import { ApiError } from '../utils/apiError.js';
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
    // Validate chat room exists and user is participant
    const chatRoom = await ChatRoom.findById(messageData.chatRoomId);
    if (!chatRoom) {
      throw new ApiError(404, 'Chat room not found');
    }

    if (!chatRoom.participants.includes(new mongoose.Types.ObjectId(messageData.senderId))) {
      throw new ApiError(403, 'User is not a participant in this chat room');
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
  }

  // Get messages for a chat room
  async getMessages(query: MessageQuery): Promise<IMessage[]> {
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
  }

  // Update message delivery status
  async markAsDelivered(messageId: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ApiError(400, 'Invalid message ID format');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID format');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
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
  }

  // Update message read status
  async markAsRead(messageId: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ApiError(400, 'Invalid message ID format');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID format');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Don't allow reading own messages
    if (message.senderId.toString() === userId) {
      return false;
    }

    // Check if already marked as read by this user
    const alreadyRead = message.readBy.some(
      read => read.userId.toString() === userId
    );

    if (!alreadyRead) {
      // Ensure the message is marked as delivered first
      const alreadyDelivered = message.deliveredTo.some(
        delivery => delivery.userId.toString() === userId
      );

      if (!alreadyDelivered) {
        message.deliveredTo.push({
          userId: new mongoose.Types.ObjectId(userId),
          deliveredAt: new Date()
        });
      }

      message.readBy.push({
        userId: new mongoose.Types.ObjectId(userId),
        readAt: new Date()
      });

      // Update status based on delivery/read state
      if (message.status === MessageStatus.SENT || message.status === MessageStatus.DELIVERED) {
        message.status = MessageStatus.READ;
      }

      await message.save();

      // Update cache
      await this.cacheService.cacheMessage(message);
    }

    return true;
  }

  // Mark multiple messages as read
  async markMultipleAsRead(messageIds: string[], userId: string): Promise<number> {
    let updatedCount = 0;

    for (const messageId of messageIds) {
      const success = await this.markAsRead(messageId, userId);
      if (success) updatedCount++;
    }

    return updatedCount;
  }

  // Get unread message count for a user
  async getUnreadCount(userId: string, chatRoomId?: string): Promise<number> {
    const query: any = {
      'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
      senderId: { $ne: new mongoose.Types.ObjectId(userId) }
    };

    if (chatRoomId) {
      query.chatRoomId = chatRoomId;
    }

    return await Message.countDocuments(query);
  }

  // Get unread count per chat room for a user (with privacy controls)
  async getUnreadCountsPerRoom(userId: string, userRole: string): Promise<{ [chatRoomId: string]: number }> {
    // Admins should not see unread counts as per requirements
    if (userRole === 'admin') {
      return {};
    }

    // First, get all chat rooms where the user is a participant or assigned agent
    const userChatRooms = await ChatRoom.find({
      $or: [
        { participants: new mongoose.Types.ObjectId(userId) },
        { assignedAgent: new mongoose.Types.ObjectId(userId) }
      ],
      isActive: true
    }).select('_id');

    const chatRoomIds = userChatRooms.map(room => room._id);

    if (chatRoomIds.length === 0) {
      return {};
    }

    // Get unread counts only for chat rooms where user is involved
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          chatRoomId: { $in: chatRoomIds },
          'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
          senderId: { $ne: new mongoose.Types.ObjectId(userId) }
        }
      },
      {
        $group: {
          _id: '$chatRoomId',
          count: { $sum: 1 }
        }
      }
    ]);

    const result: { [chatRoomId: string]: number } = {};
    unreadCounts.forEach(item => {
      result[item._id.toString()] = item.count;
    });

    return result;
  }

  // Get unread count for a specific chat room with access control
  async getUnreadCountForRoom(userId: string, chatRoomId: string, userRole: string): Promise<number> {
    // Admins should not see unread counts as per requirements
    if (userRole === 'admin') {
      return 0;
    }

    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      throw new ApiError(404, 'Chat room not found');
    }

    const isParticipant = chatRoom.participants.some(
      p => p._id.toString() === userId
    );
    const isAssignedAgent = chatRoom.assignedAgent?._id.toString() === userId;

    // Only participants and assigned agents can see unread counts
    if (!isParticipant && !isAssignedAgent) {
      throw new ApiError(403, 'Access denied to chat room');
    }

    return await Message.countDocuments({
      chatRoomId,
      'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
      senderId: { $ne: new mongoose.Types.ObjectId(userId) }
    });
  }

  // Get total unread count across all accessible chat rooms
  async getTotalUnreadCount(userId: string, userRole: string): Promise<number> {
    // Admins should not see unread counts
    if (userRole === 'admin') {
      return 0;
    }

    // Get all chat rooms where the user is a participant or assigned agent
    const userChatRooms = await ChatRoom.find({
      $or: [
        { participants: new mongoose.Types.ObjectId(userId) },
        { assignedAgent: new mongoose.Types.ObjectId(userId) }
      ],
      isActive: true
    }).select('_id');

    const chatRoomIds = userChatRooms.map(room => room._id);

    if (chatRoomIds.length === 0) {
      return 0;
    }

    // Count unread messages only from accessible chat rooms
    return await Message.countDocuments({
      chatRoomId: { $in: chatRoomIds },
      'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
      senderId: { $ne: new mongoose.Types.ObjectId(userId) }
    });
  }

  // Get message statistics
  async getMessageStats(chatRoomId: string): Promise<any> {
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
  }

  // Search messages
  async searchMessages(chatRoomId: string, searchTerm: string, limit: number = 20): Promise<IMessage[]> {
    return await Message.find({
      chatRoomId,
      content: { $regex: searchTerm, $options: 'i' }
    })
      .populate('senderId', 'username email role')
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  // Delete message (soft delete)
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ApiError(400, 'Invalid message ID format');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Only sender can delete their message
    if (message.senderId.toString() !== userId) {
      throw new ApiError(403, 'Only message sender can delete this message');
    }

    // Soft delete by updating content
    message.content = 'This message was deleted';
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Update cache
    await this.cacheService.cacheMessage(message);

    return true;
  }

  // Edit message
  async editMessage(messageId: string, userId: string, newContent: string): Promise<IMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ApiError(400, 'Invalid message ID format');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Only sender can edit their message
    if (message.senderId.toString() !== userId) {
      throw new ApiError(403, 'Only message sender can edit this message');
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Update cache
    await this.cacheService.cacheMessage(message);

    return message;
  }

  // Helper method to convert cached messages to full message objects
  private async convertCachedToMessages(cachedMessages: any[]): Promise<IMessage[]> {
    // For now, return empty array - in production, you might want to 
    // fetch additional data from database if needed
    return [];
  }
} 