import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserRole, UserStatus, Department } from '../types/index.js';
import type { IUser } from '../interfaces/index.js';

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.OFFLINE
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  socketId: {
    type: String,
    sparse: true
  },
  assignedChats: [{
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom'
  }],
  department: {
    type: String,
    enum: Object.values(Department),
    default: Department.UNKNOWN
  },
  specialization: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance (email and unique fields already have indexes)
userSchema.index({ role: 1, isOnline: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
export { UserRole, UserStatus, Department } from '../types/index.js';
export type { IUser } from '../interfaces/index.js'; 