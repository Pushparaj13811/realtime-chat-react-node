import  { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageItem } from '@/components/chat/MessageItem';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ExportDialog } from '@/components/chat/ExportDialog';
import { OnlineUsers } from '@/components/chat/OnlineUsers';
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Phone, 
  Video, 
  MoreVertical,
  ArrowLeft 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import socketService from '@/services/socket';
import type { ChatRoom } from '@/types';
import { UserRole, ChatRoomType } from '@/types';

interface ChatWindowProps {
  className?: string;
  onBackToList?: () => void;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
}

export function ChatWindow({ 
  className = '', 
  onBackToList,
  showSidebar = true,
  onToggleSidebar 
}: ChatWindowProps) {
  const { state: chatState, sendMessage, markMessageAsRead } = useChat();
  const { state: authState } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentChatRoom, messages, typingUsers, onlineUsers, onlineAgents, isConnected } = chatState;
  const { isChatActive } = usePageVisibility(currentChatRoom?._id);

  const currentMessages = currentChatRoom ? messages[currentChatRoom._id] || [] : [];
  const currentTypingUsers = currentChatRoom ? typingUsers[currentChatRoom._id] || [] : [];
  
  // Debug typing users for current chat room
  useEffect(() => {
    if (currentChatRoom) {
      console.log('⌨️ ChatWindow: Current typing users for room', currentChatRoom._id, ':', 
        currentTypingUsers.map(u => `${u.username} (${u.isTyping ? 'typing' : 'not typing'})`));
    }
  }, [currentTypingUsers, currentChatRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Set active chat room for socket context
  useEffect(() => {
    if (currentChatRoom) {
      socketService.setActiveChatRoom(currentChatRoom._id);
    } else {
      socketService.setActiveChatRoom(null);
    }
  }, [currentChatRoom]);

  // Mark messages as read only when chat is actively being viewed
  useEffect(() => {
    if (currentChatRoom && currentMessages.length > 0 && isChatActive) {
      const unreadMessages = currentMessages.filter(
        msg => {
          const currentUserId = authState.user?.userId;
          const messageSenderId = typeof msg.senderId === 'object' && msg.senderId !== null 
            ? (msg.senderId as { _id?: string; id?: string })._id || (msg.senderId as { _id?: string; id?: string }).id
            : msg.senderId;
          
          return String(messageSenderId) !== String(currentUserId) && msg.status !== 'read';
        }
      );
      
      // Delay marking as read to ensure user is actually viewing the messages
      const readTimeout = setTimeout(() => {
        unreadMessages.forEach(msg => {
          markMessageAsRead(msg._id);
        });
      }, 1000); // 1 second delay to confirm user is actively viewing

      return () => clearTimeout(readTimeout);
    }
  }, [currentChatRoom, currentMessages, authState.user?.userId, markMessageAsRead, isChatActive]);

  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };

  const handleMarkAsRead = (messageId: string) => {
    markMessageAsRead(messageId);
  };

  const getRoomName = (room: ChatRoom) => {
    if (room.name) {
      return room.name;
    }
    
    if (room.type === 'SUPPORT' as never) {
      return `Support Chat #${room._id.slice(-4)}`;
    }
    
    if (room.participants.length > 0) {
      return room.participants.map(p => p.username).join(', ');
    }
    
    return 'Chat Room';
  };



  const getOnlineCount = (room: ChatRoom) => {
    return room.participants.filter(p => p.isOnline).length;
  };

  if (!currentChatRoom) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Chat Selected
            </h3>
            <p className="text-gray-600">
              Choose a conversation from the sidebar to start messaging
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full", className)}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <Card className="rounded-none border-x-0 border-t-0">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {onBackToList && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onBackToList}
                  className="md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {getRoomName(currentChatRoom)}
                  </h2>
                  
                  <div className="flex items-center gap-1">
                    {!isConnected && (
                      <Badge variant="destructive" className="text-xs">
                        Disconnected
                      </Badge>
                    )}
                    
                    <Badge variant="secondary" className="text-xs">
                      {currentChatRoom.type}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{getOnlineCount(currentChatRoom)} online</span>
                  </div>
                  
                  {currentChatRoom.assignedAgent && (
                    <div className="flex items-center gap-2">
                      <span>Agent:</span>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          currentChatRoom.assignedAgent.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium">
                          {currentChatRoom.assignedAgent.username}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${
                          currentChatRoom.assignedAgent.isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`}>
                          {currentChatRoom.assignedAgent.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-4 w-4" />
              </Button>
              
              {authState.user && (
                <ExportDialog
                  chatRoom={currentChatRoom}
                  messages={currentMessages}
                  currentUser={{
                    username: authState.user.username,
                    email: authState.user.email
                  }}
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  }
                />
              )}
              
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>

              {onToggleSidebar && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onToggleSidebar}
                  className="md:hidden"
                >
                  <Users className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 h-full overflow-hidden">
            <div className="space-y-4 p-4">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                currentMessages.map((message) => {
                  // Enhanced isOwn logic to handle both string and object senderId
                  const currentUserId = authState.user?.userId;
                  const messageSenderId = typeof message.senderId === 'object' && message.senderId !== null 
                    ? (message.senderId as { _id?: string; id?: string })._id || (message.senderId as { _id?: string; id?: string }).id
                    : message.senderId;
                  
                  const isOwn = String(messageSenderId) === String(currentUserId);
                  
                  // Find sender from all available sources
                  let sender = null;
                  const senderId = String(message.senderId); // Ensure consistent string comparison
                  
                  if (isOwn) {
                    sender = authState.user;
                  } else {
                    // Check room participants first (most reliable)
                    sender = currentChatRoom.participants.find(p => String(p._id) === senderId);
                    
                    // If not found, check assigned agent directly
                    if (!sender && currentChatRoom.assignedAgent && String(currentChatRoom.assignedAgent._id) === senderId) {
                      sender = currentChatRoom.assignedAgent;
                    }
                    
                    // If still not found, check online users and agents
                    if (!sender) {
                      sender = onlineUsers.find(u => String(u.userId) === senderId);
                      if (!sender) {
                        sender = onlineAgents.find(a => String(a._id) === senderId);
                      }
                    }
                  }
                  
                  // Check if senderId is actually a populated user object
                  if (!sender && !isOwn && typeof message.senderId === 'object' && message.senderId !== null) {
                    console.log('🔍 SenderId is populated object:', message.senderId);
                    // Extract username from populated senderId object
                    const populatedSender = message.senderId as { _id?: string; id?: string; username?: string; role?: UserRole; email?: string };
                    if (populatedSender.username) {
                      sender = {
                        _id: String(populatedSender._id || populatedSender.id),
                        username: populatedSender.username,
                        role: populatedSender.role,
                        email: populatedSender.email
                      };
                      console.log('✅ Found sender from populated object:', sender);
                    }
                  }
                  
                  // Enhanced debugging
                  if (!sender && !isOwn) {
                    console.log('🔍 Sender lookup failed:', {
                      messageId: message._id,
                      senderId: senderId,
                      senderIdType: typeof message.senderId,
                      senderIdObject: typeof message.senderId === 'object' ? message.senderId : 'Not an object',
                      participants: currentChatRoom.participants.map(p => ({ 
                        id: String(p._id), 
                        username: p.username,
                        matches: String(p._id) === senderId
                      })),
                      assignedAgent: currentChatRoom.assignedAgent ? {
                        id: String(currentChatRoom.assignedAgent._id),
                        username: currentChatRoom.assignedAgent.username,
                        matches: String(currentChatRoom.assignedAgent._id) === senderId
                      } : null,
                      onlineUsers: onlineUsers.map(u => ({
                        id: String(u.userId),
                        username: u.username,
                        matches: String(u.userId) === senderId
                      })),
                      onlineAgents: onlineAgents.map(a => ({
                        id: String(a._id),
                        username: a.username,
                        matches: String(a._id) === senderId
                      }))
                    });
                  }
                  
                  return (
                    <MessageItem
                      key={message._id}
                      message={message}
                      isOwn={isOwn}
                      senderName={sender?.username || (isOwn ? 'You' : `Unknown User (${senderId.slice(-4)})`)}
                      senderRole={sender?.role as UserRole}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  );
                })
              )}
              
              {/* Typing Indicator */}
              {currentTypingUsers.length > 0 && (
                <TypingIndicator typingUsers={currentTypingUsers} />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <MessageInput 
            onSendMessage={handleSendMessage}
            disabled={!isConnected || (currentChatRoom.type === ChatRoomType.SUPPORT && 
              authState.user?.role === UserRole.AGENT && 
              currentChatRoom.assignedAgent?._id !== authState.user?.userId)}
            placeholder={
              !isConnected ? "Connecting..." :
              (currentChatRoom.type === ChatRoomType.SUPPORT && 
               authState.user?.role === UserRole.AGENT && 
               currentChatRoom.assignedAgent?._id !== authState.user?.userId) 
                ? "You are not assigned to this chat room" 
                : "Type a message..."
            }
          />
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <>
          <Separator orientation="vertical" />
          <div className="w-80 flex-shrink-0 bg-gray-50">
            <OnlineUsers 
              onlineUsers={onlineUsers}
              onlineAgents={onlineAgents}
              currentChatRoom={currentChatRoom}
              className="h-full border-0 rounded-none bg-transparent"
            />
          </div>
        </>
      )}
    </div>
  );
}