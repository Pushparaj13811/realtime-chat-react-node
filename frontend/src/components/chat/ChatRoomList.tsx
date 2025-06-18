import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Users, HeadphonesIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type { ChatRoom } from '@/types';
import { ChatRoomType } from '@/types';
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
    <div className={cn("h-full w-full", className)}>
      <ScrollArea className="h-full w-full">
        <div className="space-y-3 p-3 pb-6">
          {chatRooms.map((room) => {
          const unreadCount = getUnreadCount(room._id);
          const isSelected = currentChatRoomId === room._id;
          const isActive = isRoomActive(room);
          
          return (
            <Card
              key={room._id}
              className={cn(
                "p-3 cursor-pointer transition-all duration-200 hover:shadow-lg border w-full",
                isSelected 
                  ? "bg-blue-50 border-blue-300 shadow-md ring-1 ring-blue-200" 
                  : "hover:bg-white border-gray-200 bg-white/80 backdrop-blur-sm",
                unreadCount > 0 && !isSelected && "border-blue-200 bg-blue-50/50 shadow-sm"
              )}
              onClick={() => onSelectChatRoom(room)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="relative flex-shrink-0">
                  <Avatar className={cn(
                    "h-10 w-10 transition-all duration-200",
                    isSelected && "ring-2 ring-blue-500 ring-offset-2"
                  )}>
                    <AvatarFallback className={cn(
                      "text-white font-medium",
                      room.type === 'support' && "bg-green-500",
                      room.type === 'direct' && "bg-blue-500", 
                      room.type === 'group' && "bg-purple-500"
                    )}>
                      {getRoomIcon(room.type)}
                    </AvatarFallback>
                  </Avatar>
                  {isActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full shadow-sm">
                      <div className="h-full w-full bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn(
                      "font-semibold text-sm leading-tight flex-1",
                      unreadCount > 0 ? "text-gray-900" : "text-gray-700",
                      isSelected && "text-blue-900"
                    )}>
                      {getRoomName(room)}
                    </h3>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {unreadCount > 0 && (
                        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 shadow-sm">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                      <span className={cn(
                        "text-xs font-medium whitespace-nowrap",
                        isSelected ? "text-blue-600" : "text-gray-500"
                      )}>
                        {getLastActivityTime(room)}
                      </span>
                    </div>
                  </div>
                  
                  <p className={cn(
                    "text-xs leading-relaxed max-h-8 overflow-hidden",
                    unreadCount > 0 ? "text-gray-800 font-medium" : "text-gray-600",
                    isSelected && "text-gray-700"
                  )}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden'
                  }}>
                    {getLastMessagePreview(room)}
                  </p>
                  
                  {room.type === ('SUPPORT' as ChatRoomType) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit">
                      {room.assignedAgent ? (
                        <>
                          <HeadphonesIcon className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-gray-700 font-medium truncate bg-gray-100 px-1 rounded">
                            {room.assignedAgent.username}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          <span className="text-xs text-orange-700 font-medium bg-orange-100 px-1 rounded">
                            No Agent
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        </div>
      </ScrollArea>
    </div>
  );
} 