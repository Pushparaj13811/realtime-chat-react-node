import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Users, HeadphonesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type { ChatRoom, ChatRoomType } from '@/types';
import { useUnreadCount } from '@/hooks/useUnreadCount';

interface ChatRoomListProps {
  chatRooms: ChatRoom[];
  currentChatRoomId?: string;
  onSelectChatRoom: (chatRoom: ChatRoom) => void;
  className?: string;
}

export function ChatRoomList({ 
  chatRooms, 
  currentChatRoomId, 
  onSelectChatRoom,
  className = '' 
}: ChatRoomListProps) {
  const { getUnreadCount } = useUnreadCount();

  const getRoomIcon = (type: ChatRoomType) => {
    switch (type) {
      case 'DIRECT' as never:
        return <MessageCircle className="h-4 w-4" />;
      case 'GROUP' as never:
        return <Users className="h-4 w-4" />;
      case 'SUPPORT' as never:
        return <HeadphonesIcon className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getRoomName = (room: ChatRoom) => {
    if (room.name) {
      return room.name;
    }
    
    if (room.type === 'SUPPORT' as never) {
      return `Support #${room._id.slice(-4)}`;
    }
    
    if (room.participants.length > 0) {
      return room.participants.map(p => p.username).join(', ');
    }
    
    return 'Unknown Room';
  };

  const getLastMessagePreview = (room: ChatRoom) => {
    if (!room.lastMessage) {
      return 'No messages yet';
    }
    
    const preview = room.lastMessage.content.length > 50 
      ? `${room.lastMessage.content.substring(0, 50)}...`
      : room.lastMessage.content;
      
    return preview;
  };

  const getLastActivityTime = (room: ChatRoom) => {
    const lastActivity = new Date(room.lastActivity);
    const now = new Date();
    const diffInHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(lastActivity, 'HH:mm');
    } else {
      return formatDistanceToNow(lastActivity, { addSuffix: true });
    }
  };

  const isRoomActive = (room: ChatRoom) => {
    return room.participants.some(p => p.isOnline);
  };

  if (chatRooms.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-gray-500", className)}>
        <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No chat rooms available</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-2 p-4">
        {chatRooms.map((room) => {
          const unreadCount = getUnreadCount(room._id);
          const isSelected = currentChatRoomId === room._id;
          const isActive = isRoomActive(room);
          
          return (
            <Card
              key={room._id}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50",
                unreadCount > 0 && !isSelected && "border-blue-100 bg-blue-25"
              )}
              onClick={() => onSelectChatRoom(room)}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getRoomIcon(room.type)}
                    </AvatarFallback>
                  </Avatar>
                  {isActive && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={cn(
                      "font-medium text-sm truncate",
                      unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                    )}>
                      {getRoomName(room)}
                    </h3>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {unreadCount > 0 && (
                        <Badge variant="default" className="bg-blue-500 text-white text-xs px-1.5 py-0.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {getLastActivityTime(room)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-xs truncate flex-1",
                      unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                    )}>
                      {getLastMessagePreview(room)}
                    </p>
                  </div>
                  
                  {room.assignedAgent && (
                    <div className="flex items-center gap-1 mt-2">
                      <HeadphonesIcon className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Agent: {room.assignedAgent.username}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
} 