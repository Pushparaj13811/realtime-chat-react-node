import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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
  senderRole = 'user' as UserRole,
  onMarkAsRead 
}: MessageItemProps) {
  const { state: authState } = useAuth();

  const handleClick = () => {
    // Only allow marking as read for non-admin users who don't own the message
    if (!isOwn && onMarkAsRead && message.status !== 'read' && authState.user?.role !== 'admin') {
      onMarkAsRead(message._id);
    }
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'sent':
        return (
          <div className="flex items-center gap-1" title="Sent">
            <Check className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-500">Sent</span>
          </div>
        );
      case 'delivered':
        return (
          <div className="flex items-center gap-1" title="Delivered">
            <CheckCheck className="h-3 w-3 text-gray-600" />
            <span className="text-xs text-gray-600">Delivered</span>
          </div>
        );
      case 'read':
        return (
          <div className="flex items-center gap-1" title="Read">
            <CheckCheck className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-500">Read</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1" title="Failed">
            <AlertCircle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-500">Failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1" title="Sending">
            <Clock className="h-3 w-3 text-gray-400 animate-pulse" />
            <span className="text-xs text-gray-400">Sending</span>
          </div>
        );
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'agent':
        return 'bg-blue-100 text-blue-800';
      case 'user':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine if we should show unread styling (admins should not see this)
  const shouldShowUnreadStyling = !isOwn && message.status !== 'read' && authState.user?.role !== 'admin';
  
  // Determine if we should show message status (only for own messages and non-admin users)
  const shouldShowMessageStatus = isOwn && authState.user?.role !== 'admin';

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
            "p-3 shadow-sm transition-all duration-200",
            isOwn 
              ? "bg-blue-500 text-white border-blue-500" 
              : "bg-white border-gray-200 hover:bg-gray-50",
            shouldShowUnreadStyling && "border-blue-200 bg-blue-50 cursor-pointer",
            !shouldShowUnreadStyling && !isOwn && "cursor-default"
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
            
            {message.messageType !== 'text' && (
              <Badge variant="outline" className="text-xs">
                {message.messageType}
              </Badge>
            )}
          </div>
        </Card>
        
        <div className={cn(
          "flex items-center gap-2 text-xs",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <span className="text-gray-500">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {shouldShowMessageStatus && (
            <div className="flex items-center">
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