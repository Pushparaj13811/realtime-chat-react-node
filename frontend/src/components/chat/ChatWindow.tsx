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
import type { ChatRoom } from '@/types';

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

  const currentMessages = currentChatRoom ? messages[currentChatRoom._id] || [] : [];
  const currentTypingUsers = currentChatRoom ? typingUsers[currentChatRoom._id] || [] : [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (currentChatRoom && currentMessages.length > 0) {
      const unreadMessages = currentMessages.filter(
        msg => msg.senderId !== authState.user?.userId && msg.status !== 'read' as never
      );
      
      unreadMessages.forEach(msg => {
        markMessageAsRead(msg._id);
      });
    }
  }, [currentChatRoom, currentMessages, authState.user?.userId, markMessageAsRead]);

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

  const getRoomParticipants = (room: ChatRoom) => {
    return room.participants.filter(p => p._id !== authState.user?.userId);
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
                    <div>
                      Agent: {currentChatRoom.assignedAgent.username}
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
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                currentMessages.map((message) => {
                  const isOwn = message.senderId === authState.user?.userId;
                  const sender = isOwn 
                    ? authState.user 
                    : getRoomParticipants(currentChatRoom).find(p => p._id === message.senderId);
                  
                  return (
                    <MessageItem
                      key={message._id}
                      message={message}
                      isOwn={isOwn}
                      senderName={sender?.username || 'Unknown User'}
                      senderRole={sender?.role}
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
            disabled={!isConnected}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
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
              className="h-full border-0 rounded-none bg-transparent"
            />
          </div>
        </>
      )}
    </div>
  );
}