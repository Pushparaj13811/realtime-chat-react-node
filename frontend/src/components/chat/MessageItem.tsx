import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, MessageStatus, UserRole } from '../../types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderRole?: UserRole;
  onMarkAsRead?: (messageId: string) => void;
}

export function MessageItem({ 
  message, 
  isOwn, 
  senderName = 'Unknown User',
  senderRole = 'USER' as never,
  onMarkAsRead 
}: MessageItemProps) {
  const handleClick = () => {
    if (!isOwn && onMarkAsRead && message.status !== 'READ' as never) {
      onMarkAsRead(message._id);
    }
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'SENT' as never:
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'DELIVERED' as never:
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'READ' as never:
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'FAILED' as never:
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN' as never:
        return 'bg-red-100 text-red-800';
      case 'AGENT' as never:
        return 'bg-blue-100 text-blue-800';
      case 'USER' as never:
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className={cn(
        "flex gap-3 mb-4 group",
        isOwn ? "justify-end" : "justify-start"
      )}
      onClick={handleClick}
    >
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("max-w-[70%] space-y-1", isOwn && "order-first")}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {senderName}
            </span>
            <Badge 
              variant="secondary" 
              className={cn("text-xs px-1.5 py-0.5", getRoleBadgeColor(senderRole))}
            >
              {senderRole}
            </Badge>
          </div>
        )}
        
        <Card 
          className={cn(
            "p-3 shadow-sm transition-all duration-200 cursor-pointer",
            isOwn 
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white border-gray-200 hover:bg-gray-50",
            !isOwn && message.status !== 'read' as never && "border-blue-200 bg-blue-50"
          )}
        >
          <div className="space-y-2">
            {message.replyTo && (
              <div className="text-xs opacity-75 border-l-2 border-current pl-2">
                Reply to previous message
              </div>
            )}
            
            <div className="text-sm leading-relaxed">
              {message.content}
            </div>
            
            {message.messageType !== 'TEXT' && (
              <Badge variant="outline" className="text-xs">
                {message.messageType}
              </Badge>
            )}
          </div>
        </Card>
        
        <div className={cn(
          "flex items-center gap-1 text-xs text-gray-500",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <span>
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isOwn && (
            <div className="flex items-center gap-1">
              {getStatusIcon(message.status)}
            </div>
          )}
        </div>
      </div>
      
      {isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-blue-500 text-white">
            You
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
} 