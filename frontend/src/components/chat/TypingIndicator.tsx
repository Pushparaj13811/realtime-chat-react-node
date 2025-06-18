import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import type { UserTyping } from '@/types';

interface TypingIndicatorProps {
  typingUsers: UserTyping[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className = '' }: TypingIndicatorProps) {
  const { state: authState } = useAuth();
  
  // Filter out current user from typing users
  const otherTypingUsers = typingUsers.filter(user => user.userId !== authState.user?.userId);
  
  console.log('⌨️ TypingIndicator: Received users:', typingUsers.map(u => u.username));
  console.log('⌨️ TypingIndicator: Other users (filtered):', otherTypingUsers.map(u => u.username));
  console.log('⌨️ TypingIndicator: Current user:', authState.user?.username);
  
  if (otherTypingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].username} is typing...`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].username} and ${otherTypingUsers[1].username} are typing...`;
    } else {
      return `${otherTypingUsers[0].username} and ${otherTypingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mx-4 mb-2 ${className}`}>
      <div className="flex -space-x-2">
        {otherTypingUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="h-7 w-7 border-2 border-white shadow-sm">
            <AvatarFallback className="text-xs bg-blue-500 text-white">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-blue-700">
          {getTypingText()}
        </span>
        
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
        </div>
      </div>
    </div>
  );
} 