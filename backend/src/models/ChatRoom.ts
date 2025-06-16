import mongoose, { Schema } from 'mongoose';
import { ChatRoomType, ChatRoomStatus } from '../types/index.js';
import type { IChatRoom } from '../interfaces/index.js';

const chatRoomSchema = new Schema<IChatRoom>({
  name: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(ChatRoomType),
    default: ChatRoomType.DIRECT
  },
  status: {
    type: String,
    enum: Object.values(ChatRoomStatus),
    default: ChatRoomStatus.ACTIVE
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  assignedAgent: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    subject: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    tags: [String],
    customerInfo: {
      name: String,
      email: String,
      phone: String
    }
  },
  transferHistory: [{
    fromAgent: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    toAgent: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    transferredAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ assignedAgent: 1, status: 1 });
chatRoomSchema.index({ type: 1, status: 1 });
chatRoomSchema.index({ lastActivity: -1 });
chatRoomSchema.index({ createdBy: 1 });
chatRoomSchema.index({ isActive: 1 });

export const ChatRoom = mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema);
export { ChatRoomType, ChatRoomStatus } from '../types/index.js';
export type { IChatRoom } from '../interfaces/index.js'; 