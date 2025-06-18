import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {  UserCheck, Headphones, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { SocketUser, User, ChatRoom } from '@/types';
import { UserRole } from '@/types';

interface OnlineUsersProps {
  onlineUsers: SocketUser[];
  onlineAgents: User[];
  currentChatRoom?: ChatRoom;
  className?: string;
}

export function OnlineUsers({ onlineUsers, onlineAgents, currentChatRoom, className = '' }: OnlineUsersProps) {
  const { state: authState } = useAuth();
  
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

  // Get assigned agent for current chat room
  const assignedAgent = currentChatRoom?.assignedAgent;

  // Filter out offline agents for display, but include assigned agent even if offline
  const actuallyOnlineAgents = onlineAgents.filter(agent => 
    agent.isOnline && agent.status?.toLowerCase() !== 'offline'
  );

  // If user is in a chat room with assigned agent, show that agent's status
  let agentsToShow = actuallyOnlineAgents;
  if (authState.user?.role === UserRole.USER && assignedAgent) {
    // For users, prioritize showing the assigned agent for this chat room
    const assignedAgentInList = actuallyOnlineAgents.find(agent => agent._id === assignedAgent._id);
    if (assignedAgentInList) {
      // Assigned agent is already online, show them first
      agentsToShow = [assignedAgentInList, ...actuallyOnlineAgents.filter(agent => agent._id !== assignedAgent._id)];
    } else {
      // Assigned agent is not in online list (could be offline), show them separately
      agentsToShow = [assignedAgent, ...actuallyOnlineAgents];
    }
  }

  // Filter users to only show actual users (not agents/admins)
  const actualUsers = onlineUsers.filter(user => 
    user.role?.toLowerCase() === UserRole.USER
  );

  // Determine what to show based on user role
  const currentUserRole = authState.user?.role as UserRole;
  const shouldShowUsers = currentUserRole === UserRole.ADMIN || (currentUserRole === UserRole.AGENT && actualUsers.length > 0);
  const shouldShowAgents = agentsToShow.length > 0;

  const totalVisible = (shouldShowUsers ? actualUsers.length : 0) + (shouldShowAgents ? agentsToShow.length : 0);

  if (totalVisible === 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center text-gray-500">
          <WifiOff className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">
            {currentUserRole === UserRole.USER ? 'No agents available' : 'No users online'}
          </p>
          {currentUserRole === UserRole.USER && currentChatRoom && !assignedAgent && (
            <p className="text-xs text-orange-600 mt-1">
              No agent assigned to this chat
            </p>
          )}
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
            {currentUserRole === UserRole.USER && currentChatRoom ? 
              `Chat Room Status (${totalVisible})` : 
              `Online (${totalVisible})`
            }
          </h3>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        <div className="p-4 space-y-4">
          {/* Show Assigned Agent for current chat room (for Users) */}
          {shouldShowAgents && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Headphones className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">
                  {currentUserRole === UserRole.USER && currentChatRoom ? 
                    `Your Agent (${agentsToShow.length})` :
                    currentUserRole === UserRole.USER ? 'Your Agents' : 'Support Agents'
                  } ({agentsToShow.length})
                </span>
              </div>
              <div className="space-y-2">
                {agentsToShow.map((agent) => {
                  const isAssignedToCurrentRoom = assignedAgent && agent._id === assignedAgent._id;
                  return (
                    <div key={agent._id} className={cn(
                      "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50",
                      isAssignedToCurrentRoom && currentUserRole === UserRole.USER && "border border-blue-200 bg-blue-50"
                    )}>
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
                          {isAssignedToCurrentRoom && currentUserRole === UserRole.USER && (
                            <Badge variant="default" className="text-xs bg-blue-500 text-white">
                              Assigned
                            </Badge>
                          )}
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Online Users - Show only to admins and agents with assigned users */}
          {shouldShowUsers && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-gray-700">
                  {currentUserRole === UserRole.AGENT ? 'Your Users' : 'Users'} ({actualUsers.length})
                </span>
              </div>
              <div className="space-y-2">
                {actualUsers.map((user) => (
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