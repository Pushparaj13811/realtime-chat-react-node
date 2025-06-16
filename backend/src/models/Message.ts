import mongoose, { Schema } from 'mongoose';
import { MessageType, MessageStatus } from '../types/index.js';
import type { IMessage } from '../interfaces/index.js';

const messageSchema = new Schema<IMessage>({
  chatRoomId: {
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT
  },
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    fileName: String,
    fileSize: Number,
    mimeType: String,
    imageUrl: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ chatRoomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ 'readBy.userId': 1 });
messageSchema.index({ 'deliveredTo.userId': 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export { MessageType, MessageStatus } from '../types/index.js';
export type { IMessage } from '../interfaces/index.js'; 