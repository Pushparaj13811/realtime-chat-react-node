import mongoose, { Schema } from 'mongoose';
import { Department, ProblemType } from '../types/index.js';

export enum TicketStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ISupportTicket extends mongoose.Document {
  ticketNumber: string;
  title: string;
  description: string;
  department: Department;
  problemType: ProblemType;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: mongoose.Types.ObjectId; // User who created the ticket
  assignedAgent?: mongoose.Types.ObjectId; // Agent assigned by admin
  assignedBy?: mongoose.Types.ObjectId; // Admin who made the assignment
  chatRoom?: mongoose.Types.ObjectId; // Associated chat room once assigned
  metadata?: {
    userInfo?: {
      email?: string;
      phone?: string;
    };
    tags?: string[];
    estimatedResolution?: Date;
  };
  assignedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    enum: Object.values(Department),
    required: true
  },
  problemType: {
    type: String,
    enum: Object.values(ProblemType),
    required: true
  },
  priority: {
    type: String,
    enum: Object.values(TicketPriority),
    default: TicketPriority.MEDIUM
  },
  status: {
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.PENDING
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAgent: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  chatRoom: {
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom'
  },
  metadata: {
    userInfo: {
      email: String,
      phone: String
    },
    tags: [String],
    estimatedResolution: Date
  },
  assignedAt: Date,
  resolvedAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
supportTicketSchema.index({ status: 1, priority: -1 });
supportTicketSchema.index({ createdBy: 1, status: 1 });
supportTicketSchema.index({ assignedAgent: 1, status: 1 });
supportTicketSchema.index({ department: 1, status: 1 });

// Auto-generate ticket number
supportTicketSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketNumber = `TICKET-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema); 