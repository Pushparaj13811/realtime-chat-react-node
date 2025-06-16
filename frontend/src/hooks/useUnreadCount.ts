import { useEffect, useMemo } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

interface UnreadCounts {
  [chatRoomId: string]: number;
}

export function useUnreadCount() {
  const { state: chatState } = useChat();
  const { state: authState } = useAuth();

  // Calculate total unread count across all rooms
  const totalUnreadCount = useMemo(() => {
    return Object.values(chatState.unreadCounts).reduce((total, count) => total + count, 0);
  }, [chatState.unreadCounts]);

  // Get unread count for a specific chat room
  const getUnreadCount = (chatRoomId: string): number => {
    return chatState.unreadCounts[chatRoomId] || 0;
  };

  // Get all unread counts
  const getAllUnreadCounts = (): UnreadCounts => {
    return chatState.unreadCounts;
  };

  // Get chat rooms with unread messages
  const getChatRoomsWithUnreadMessages = () => {
    return chatState.chatRooms.filter(room => 
      (chatState.unreadCounts[room._id] || 0) > 0
    );
  };

  // Load unread count from server
  const refreshUnreadCount = async () => {
    try {
      if (!authState.isAuthenticated) return;

      const response = await apiService.getUnreadCount();
      if (response.success && response.data) {
        // The response would contain total count, but we need per-room counts
        // This would require backend enhancement to return per-room unread counts
        console.log('Total unread count:', response.data.count);
      }
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
  };

  // Load unread count on mount
  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshUnreadCount();
    }
  }, [authState.isAuthenticated]);

  return {
    totalUnreadCount,
    unreadCounts: chatState.unreadCounts,
    getUnreadCount,
    getAllUnreadCounts,
    getChatRoomsWithUnreadMessages,
    refreshUnreadCount,
  };
} 