import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {  UserCheck, Headphones, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocketUser, User } from '@/types';

interface OnlineUsersProps {
  onlineUsers: SocketUser[];
  onlineAgents: User[];
  className?: string;
}

export function OnlineUsers({ onlineUsers, onlineAgents, className = '' }: OnlineUsersProps) {
  // Debug logging for status issues
  console.log('OnlineUsers - Agents:', onlineAgents.map(a => ({ username: a.username, status: a.status, isOnline: a.isOnline })));
  console.log('OnlineUsers - Users:', onlineUsers.map(u => ({ username: u.username, role: u.role })));

  const getStatusColor = (user: User | SocketUser) => {
    // For User objects (agents), check both isOnline and status
    if ('isOnline' in user && 'status' in user) {
      if (!user.isOnline || user.status?.toLowerCase() === 'offline') {
        return 'bg-gray-400';
      }
      const normalizedStatus = user.status?.toLowerCase();
      switch (normalizedStatus) {
        case 'online':
          return 'bg-green-500';
        case 'away':
          return 'bg-yellow-500';
        case 'busy':
          return 'bg-red-500';
        default:
          return 'bg-green-500'; // Default to online if connected
      }
    }
    // For SocketUser objects (connected users), assume online
    return 'bg-green-500';
  };

  const getStatusText = (user: User | SocketUser) => {
    if ('status' in user && 'isOnline' in user) {
      if (!user.isOnline) return 'Offline';
      return user.status?.toLowerCase() === 'online' ? 'Online' : (user.status || 'Online');
    }
    return 'Online';
  };

  const getRoleBadgeColor = (role: string) => {
    const normalizedRole = role?.toUpperCase();
    switch (normalizedRole) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'AGENT':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter out offline agents for display
  const actuallyOnlineAgents = onlineAgents.filter(agent => 
    agent.isOnline && agent.status?.toLowerCase() !== 'offline'
  );

  const totalOnline = onlineUsers.length + actuallyOnlineAgents.length;

  if (totalOnline === 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center text-gray-500">
          <WifiOff className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No users online</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-green-600" />
          <h3 className="font-medium text-sm text-gray-900">
            Online ({totalOnline})
          </h3>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        <div className="p-4 space-y-4">
          {/* Online Agents */}
          {actuallyOnlineAgents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Headphones className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">
                  Support Agents ({actuallyOnlineAgents.length})
                </span>
              </div>
              <div className="space-y-2">
                {actuallyOnlineAgents.map((agent) => (
                  <div key={agent._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {agent.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-white rounded-full",
                        getStatusColor(agent)
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
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 capitalize">
                          {getStatusText(agent)}
                        </span>
                        {agent.department && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400 capitalize">
                              {agent.department.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>
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
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-white rounded-full",
                        getStatusColor(user)
                      )}></div>
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
                      <span className="text-xs text-gray-500">
                        {getStatusText(user)}
                      </span>
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