import { useEffect, useMemo } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import apiService from '../services/api';

interface UnreadCounts {
  [chatRoomId: string]: number;
}

export function useUnreadCount() {
  const { state: chatState } = useChat();
  const { state: authState } = useAuth();

  // Calculate total unread count across all rooms (respecting privacy)
  const totalUnreadCount = useMemo(() => {
    // Admins should not see unread counts as per requirements
    if (authState.user?.role === UserRole.ADMIN) {
      return 0;
    }
    return Object.values(chatState.unreadCounts).reduce((total, count) => total + count, 0);
  }, [chatState.unreadCounts, authState.user?.role]);

  // Get unread count for a specific chat room (with privacy controls)
  const getUnreadCount = (chatRoomId: string): number => {
    // Admins should not see unread counts
    if (authState.user?.role === UserRole.ADMIN) {
      return 0;
    }

    // Backend already filters the data, so we can trust what's in the state
    return chatState.unreadCounts[chatRoomId] || 0;
  };

  // Get all unread counts (with privacy filtering)
  const getAllUnreadCounts = (): UnreadCounts => {
    // Admins should not see unread counts
    if (authState.user?.role === UserRole.ADMIN) {
      return {};
    }

    // Backend already filters the data, so we can trust what's in the state
    return chatState.unreadCounts;
  };

  // Get chat rooms with unread messages (with privacy filtering)
  const getChatRoomsWithUnreadMessages = () => {
    // Admins should not see unread counts
    if (authState.user?.role === UserRole.ADMIN) {
      return [];
    }

    // Backend already filters the data, so we can trust what's in the state
    return chatState.chatRooms.filter(room => 
      (chatState.unreadCounts[room._id] || 0) > 0
    );
  };

  // Load unread count from server
  const refreshUnreadCount = async () => {
    try {
      if (!authState.isAuthenticated) return;

      // Don't fetch unread counts for admins
      if (authState.user?.role === UserRole.ADMIN) {
        return { total: 0, perRoom: {} };
      }

      const response = await apiService.getUnreadCount();
      if (response.success && response.data) {
        // Update unread counts in chat state  
        const data = response.data as { total?: number; perRoom?: { [key: string]: number } };
        const total = data.total || 0;
        const perRoom = data.perRoom || {};
        
        // Dispatch the unread counts to ChatContext
        // Note: This needs to be handled by ChatContext since we don't have access to dispatch here
        console.log('Total unread count:', total);
        console.log('Per-room counts:', perRoom);
        
        // Return the data so ChatContext can use it
        return { total, perRoom };
      }
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
    return { total: 0, perRoom: {} };
  };

  // Load unread count on mount (only for non-admin users)
  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.role !== UserRole.ADMIN) {
      refreshUnreadCount();
    }
  }, [authState.isAuthenticated, authState.user?.role]);

  return {
    totalUnreadCount,
    unreadCounts: getAllUnreadCounts(),
    getUnreadCount,
    getAllUnreadCounts,
    getChatRoomsWithUnreadMessages,
    refreshUnreadCount,
  };
} 