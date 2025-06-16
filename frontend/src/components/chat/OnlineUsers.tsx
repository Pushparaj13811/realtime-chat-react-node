import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserCheck, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocketUser, User, UserStatus } from '@/types';

interface OnlineUsersProps {
  onlineUsers: SocketUser[];
  onlineAgents: User[];
  className?: string;
}

export function OnlineUsers({ onlineUsers, onlineAgents, className = '' }: OnlineUsersProps) {
  const getStatusColor = (status?: UserStatus) => {
    switch (status) {
      case 'ONLINE' as never:
        return 'bg-green-500';
      case 'AWAY' as never:
        return 'bg-yellow-500';
      case 'BUSY' as never:
        return 'bg-red-500';
      case 'OFFLINE' as never:
      default:
        return 'bg-gray-400';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'AGENT':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalOnline = onlineUsers.length + onlineAgents.length;

  if (totalOnline === 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center text-gray-500">
          <Users className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No users online</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-sm text-gray-900">
            Online ({totalOnline})
          </h3>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        <div className="p-4 space-y-4">
          {/* Online Agents */}
          {onlineAgents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Headphones className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">
                  Agents ({onlineAgents.length})
                </span>
              </div>
              <div className="space-y-2">
                {onlineAgents.map((agent) => (
                  <div key={agent._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {agent.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-white rounded-full",
                        getStatusColor(agent.status)
                      )}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {agent.username}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs px-1.5 py-0.5", getRoleBadgeColor(agent.role))}
                        >
                          {agent.role}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500 capitalize">
                        {agent.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Online Users */}
          {onlineUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-gray-700">
                  Users ({onlineUsers.length})
                </span>
              </div>
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div key={user.socketId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {user.username}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs px-1.5 py-0.5", getRoleBadgeColor(user.role))}
                        >
                          {user.role}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">Online</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
} 