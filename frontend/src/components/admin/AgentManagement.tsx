import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserCheck, 
  ArrowRightLeft, 
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Settings,
  Shield,
  RefreshCw,
  UserMinus,
  Info,
  Clock,
  Target,
  Zap,
  HelpCircle,
  Headphones,
  MessageCircle
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ChatRoomType, type ChatRoom, type User } from '@/types';
import apiService from '@/services/api';
import socketService from '@/services/socket';
import { useToast } from '@/components/ui/toast';

interface AgentWorkload {
  _id: string;
  username: string;
  email: string;
  specialization?: string;
  isOnline: boolean;
  status: string;
  activeChatsCount: number;
  workloadPercentage: number;
  assignedChats: Array<{
    _id: string;
    type: string;
    status: string;
    lastActivity: string;
    metadata?: {
      subject?: string;
      priority?: string;
    };
  }>;
}

export function AgentManagement() {
  const [agentWorkloads, setAgentWorkloads] = useState<AgentWorkload[]>([]);
  const [allChatRooms, setAllChatRooms] = useState<ChatRoom[]>([]);
  const [allAgents, setAllAgents] = useState<User[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Use room ID to track which dialogs are open
  const [openTransferDialog, setOpenTransferDialog] = useState<string | null>(null);
  const [openAssignDialog, setOpenAssignDialog] = useState<string | null>(null);
  
  const { refreshChatRooms } = useChat();
  const { state: authState } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Set up real-time socket event listeners for admin updates
  useEffect(() => {
    if (authState.user?.role !== UserRole.ADMIN) {
      return;
    }

    console.log('🔗 AgentManagement: Setting up socket listeners for real-time updates');

    // Listen for agent assignment changes
    const handleAgentRemoved = (data: { chatRoomId: string; removedAgentId: string; newAgent: User | null; reason: string; timestamp: Date }) => {
      console.log('🚨 AgentManagement: Agent removed from room:', data);
      addToast({
        type: 'info',
        title: 'Agent Removed',
        message: `Agent has been removed from chat room #${data.chatRoomId.slice(-6)}`,
        duration: 5000
      });
      
      // Refresh data to show updates
      loadAllData();
    };

    const handleAgentAssigned = (data: { chatRoom: object; reason: string }) => {
      console.log('✅ AgentManagement: Agent assigned to room:', data);
      addToast({
        type: 'success',
        title: 'Agent Assigned',
        message: `Agent has been assigned to a chat room`,
        duration: 5000
      });
      
      // Refresh data to show updates
      loadAllData();
    };

    // Set up socket listeners
    socketService.on('agent-removed', handleAgentRemoved);
    socketService.on('agent-assignment-received', handleAgentAssigned);

    // Cleanup socket listeners on unmount
    return () => {
      socketService.off('agent-removed', handleAgentRemoved);
      socketService.off('agent-assignment-received', handleAgentAssigned);
    };
  }, [authState.user?.role, addToast]);

  // Load all data for admin view
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [workloadsResponse, chatRoomsResponse, agentsResponse] = await Promise.all([
        apiService.getAgentWorkloads(),
        apiService.getAllChatRoomsAdmin(), // Admin should see all chat rooms
        apiService.getAllUsers() // Admin should see all users/agents
      ]);

      if (workloadsResponse.success && workloadsResponse.data) {
        setAgentWorkloads(workloadsResponse.data as AgentWorkload[]);
      }

      if (chatRoomsResponse.success && chatRoomsResponse.data) {
        setAllChatRooms(chatRoomsResponse.data as ChatRoom[]);
      }

      if (agentsResponse.success && agentsResponse.data) {
        // Filter only agents and admins
        const agentsOnly = (agentsResponse.data as User[]).filter(
          user => user.role === UserRole.AGENT || user.role === UserRole.ADMIN
        );
        setAllAgents(agentsOnly);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      addToast({
        type: 'error',
        title: 'Data Load Failed',
        message: 'Failed to load agent and chat room data',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy function for backward compatibility
  const loadAgentWorkloads = loadAllData;

  useEffect(() => {
    if (authState.user?.role === UserRole.ADMIN) {
      loadAgentWorkloads();
    }
  }, [authState.user?.role]);

  // Get agent workload count for display
  const getAgentChatCount = (agentId: string): number => {
    const workload = agentWorkloads.find(w => w._id === agentId);
    return workload?.activeChatsCount || 0;
  };

  // Get chat room icon based on type
  const getChatRoomIcon = (type: ChatRoomType) => {
    switch (type) {
      case ChatRoomType.SUPPORT:
        return <Headphones className="h-4 w-4" />;
      case ChatRoomType.DIRECT:
        return <MessageCircle className="h-4 w-4" />;
      case ChatRoomType.GROUP:
        return <Users className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Get chat room name
  const getChatRoomName = (room: ChatRoom) => {
    if (room.name) return room.name;
    
    switch (room.type) {
      case ChatRoomType.SUPPORT:
        return `Support #${room._id.slice(-6)}`;
      case ChatRoomType.DIRECT:
        return `Direct Chat #${room._id.slice(-6)}`;
      case ChatRoomType.GROUP:
        return `Group Chat #${room._id.slice(-6)}`;
      default:
        return `Chat #${room._id.slice(-6)}`;
    }
  };

  // Transfer agent to different chat room
  const handleTransferAgent = async (chatRoomId: string) => {
    if (!selectedAgent || !transferReason.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.transferAgent(chatRoomId, selectedAgent, transferReason.trim());
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Agent Transferred',
          message: 'Agent has been successfully transferred',
          duration: 5000
        });
        
        await Promise.all([
          loadAgentWorkloads(),
          refreshChatRooms()
        ]);
        closeTransferDialog();
      } else {
        console.error('Transfer failed:', response.message);
        addToast({
          type: 'error',
          title: 'Transfer Failed',
          message: response.message || 'Unknown error occurred',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Failed to transfer agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addToast({
        type: 'error',
        title: 'Transfer Failed',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Assign agent to chat room
  const handleAssignAgent = async (chatRoomId: string) => {
    if (!selectedAgent) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.assignAgentToRoom(chatRoomId, selectedAgent, 'Admin assignment');

      if (response.success) {
        addToast({
          type: 'success',
          title: 'Agent Assigned',
          message: 'Agent has been successfully assigned to the chat room',
          duration: 5000
        });
        
        await Promise.all([
          loadAgentWorkloads(),
          refreshChatRooms()
        ]);
        closeAssignDialog();
      } else {
        console.error('Assignment failed:', response.message);
        addToast({
          type: 'error',
          title: 'Assignment Failed',
          message: response.message || 'Unknown error occurred',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Failed to assign agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove agent from chat room
  const handleRemoveAgent = async (chatRoomId: string, reason: string = 'Admin removal') => {
    try {
      setIsLoading(true);
      const response = await apiService.removeAgentFromRoom(chatRoomId, reason);

      if (response.success) {
        addToast({
          type: 'info',
          title: 'Agent Removed',
          message: 'Agent has been removed from the chat room',
          duration: 5000
        });
        
        await Promise.all([
          loadAgentWorkloads(),
          refreshChatRooms()
        ]);
      } else {
        console.error('Removal failed:', response.message);
        addToast({
          type: 'error',
          title: 'Removal Failed',
          message: response.message || 'Unknown error occurred',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Failed to remove agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addToast({
        type: 'error',
        title: 'Removal Failed',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Close dialogs and reset state
  const closeTransferDialog = () => {
    setOpenTransferDialog(null);
    setSelectedAgent('');
    setTransferReason('');
  };

  const closeAssignDialog = () => {
    setOpenAssignDialog(null);
    setSelectedAgent('');
  };

  const handleAssignDialogChange = (open: boolean) => {
    if (!open) {
      closeAssignDialog();
    }
  };

  // Get unique agents without duplicates (including offline agents for assignment)
  const availableAgents = allAgents.reduce((unique: User[], agent) => {
    if (agent.role === UserRole.AGENT || agent.role === UserRole.ADMIN) {
      const exists = unique.find(a => a._id === agent._id);
      if (!exists) {
        unique.push(agent);
      }
    }
    return unique;
  }, []);

  // Use all chat rooms for display since we removed filtering
  const filteredChatRooms = allChatRooms;

  // Calculate statistics for better UX
  const totalAgents = availableAgents.length;
  const onlineAgents = availableAgents.filter(agent => agent.isOnline).length;
  const unassignedRooms = filteredChatRooms.filter(room => !room.assignedAgent).length;

  if (authState.user?.role !== UserRole.ADMIN) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Access denied. Admin privileges required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Quick Stats */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/chat')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Chat
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/admin')}
                className="mr-2"
              >
                <Shield className="h-4 w-4 mr-1" />
                Admin Panel
              </Button>
              <Settings className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Agent Management</h1>
                <p className="text-sm text-gray-500">Manage agent assignments and monitor workloads</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{onlineAgents}/{totalAgents} agents online</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-orange-500" />
                  <span>{unassignedRooms} unassigned chats</span>
                </div>
              </div>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
              
              <Button onClick={loadAgentWorkloads} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Badge variant="outline" className="text-blue-700">
                <Settings className="h-3 w-3 mr-1" />
                Agent Manager
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-blue-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <div className="font-medium text-blue-900">Agent Management Guide</div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="font-medium text-blue-800">👤 Agent Actions:</div>
                      <div className="space-y-1 text-sm">
                        <div>• <strong>Assign Agent:</strong> Click "Assign Agent" on unassigned chat rooms (orange badge)</div>
                        <div>• <strong>Remove Agent:</strong> Unassign agents from chat rooms when needed</div>
                        <div>• <strong>Monitor Workload:</strong> Track agent performance and chat distribution</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="font-medium text-blue-800">📊 Dashboard Features:</div>
                      <div className="space-y-1 text-sm">
                        <div>• <strong>Real-time Updates:</strong> Live notifications for all agent changes</div>
                        <div>• <strong>Workload Monitoring:</strong> Visual indicators for agent capacity</div>
                        <div>• <strong>Performance Metrics:</strong> Active chat counts and workload percentages</div>
                        <div>• <strong>Priority Handling:</strong> Urgent/high priority chat identification</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <div className="font-medium text-blue-900 mb-2">🎯 Quick Actions Guide:</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span><strong>Orange:</strong> Needs agent assignment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span><strong>Green:</strong> Agent assigned & active</span>
                      </div>
                                             <div className="flex items-center gap-2">
                         <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                         <span><strong>Red (pulse):</strong> Agent overloaded ({'>'} 80%)</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                    💡 <strong>Pro Tips:</strong> Monitor agent workload percentages to balance assignments. Agents with {'>'} 80% workload are considered overloaded. Use the refresh button to get the latest data, or wait for real-time updates.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}



      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Enhanced Agent Workloads */}
          <Card className="shadow-lg border-0  from-blue-50 to-indigo-50">
            <CardHeader className="bg-gradient-to-r text-primary rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl text-primary font-bold">Agent Performance Hub</h3>
                  <p className="text-sm mt-1">Real-time workload monitoring & distribution</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {agentWorkloads.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-10 w-10 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-700 mb-2">No Agent Data Available</h4>
                      <p className="text-sm text-gray-500 mb-4">Start monitoring agent performance</p>
                      <Button variant="outline" size="sm" onClick={loadAgentWorkloads} className="shadow-sm hover:shadow-md transition-shadow">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Load Performance Data
                      </Button>
                    </div>
                  ) : (
                    agentWorkloads.map((agent) => (
                      <div key={agent._id} className="p-5 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${agent.isOnline ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}>
                                {agent.username.charAt(0).toUpperCase()}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                {agent.username}
                                {agent.activeChatsCount === 0 && agent.isOnline && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">
                                    <Target className="h-3 w-3 mr-1" />
                                    Available
                                  </Badge>
                                )}
                                {agent.activeChatsCount > 5 && (
                                  <Badge variant="destructive" className="text-xs animate-pulse">
                                    <Zap className="h-3 w-3 mr-1" />
                                    High Load
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">{agent.email}</div>
                              {agent.specialization && (
                                <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full inline-block mt-1">
                                  {agent.specialization}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant={agent.isOnline ? 'default' : 'secondary'} className={`px-3 py-1 ${agent.isOnline ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-600'}`}>
                            {agent.isOnline ? '🟢 Online' : '⚫ Offline'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Active Chats:</span>
                            <span className="font-medium">{agent.activeChatsCount}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                agent.workloadPercentage > 80 ? 'bg-red-500' :
                                agent.workloadPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(agent.workloadPercentage, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 flex items-center justify-between">
                            <span>{agent.workloadPercentage.toFixed(1)}% workload</span>
                            {agent.workloadPercentage > 80 && (
                              <span className="text-red-600 font-medium">⚠ Overloaded</span>
                            )}
                          </div>
                        </div>

                        {agent.assignedChats.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Assigned Chats:
                            </div>
                            <div className="space-y-1">
                              {agent.assignedChats.slice(0, 3).map((chat) => (
                                <div key={chat._id} className="text-xs p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono">#{chat._id.slice(-6)}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {chat.status}
                                    </Badge>
                                  </div>
                                  {chat.metadata?.subject && (
                                    <div className="text-gray-600 truncate mt-1">
                                      {chat.metadata.subject}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {agent.assignedChats.length > 3 && (
                                <div className="text-xs text-gray-500 text-center py-1">
                                  +{agent.assignedChats.length - 3} more chats...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Enhanced Chat Room Management */}
          <Card className="shadow-lg border-0 text-primary">
            <CardHeader className="bg-gradient-to-r text-primary rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Chat Room Command Center</h3>
                  <p className="text-sm mt-1">Assign & manage agents across all conversations</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredChatRooms.map((room: ChatRoom) => {
                    // Determine if agent was recently removed (no assigned agent but has transfer history)
                    const hasTransferHistory = room.transferHistory && room.transferHistory.length > 0;
                    const recentlyUnassigned = !room.assignedAgent && hasTransferHistory;
                    
                    return (
                    <div key={room._id} className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                      recentlyUnassigned ? 'border-orange-300 bg-orange-50' : 
                      !room.assignedAgent ? 'border-yellow-300 bg-yellow-50' : 
                      'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium flex items-center gap-2">
                              {getChatRoomIcon(room.type)}
                              <span className="font-mono">{getChatRoomName(room)}</span>
                              <Badge variant="secondary" className="text-xs">
                                {room.type}
                              </Badge>
                            </div>
                            {recentlyUnassigned && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                <UserMinus className="h-3 w-3 mr-1" />
                                Agent Removed
                              </Badge>
                            )}
                            {!room.assignedAgent && !recentlyUnassigned && (
                              <Badge variant="secondary" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Needs Agent
                              </Badge>
                            )}
                          </div>
                          {room.metadata?.subject && (
                            <div className="text-sm text-gray-600 truncate max-w-xs">
                              {room.metadata.subject}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {room.metadata?.priority && (
                            <Badge variant={
                              room.metadata.priority === 'urgent' ? 'destructive' :
                              room.metadata.priority === 'high' ? 'destructive' :
                              room.metadata.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {room.metadata.priority}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {room.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {room.assignedAgent ? (
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <div>
                                <div className="text-sm font-medium">
                                  {room.assignedAgent?.username}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {room.assignedAgent?.email}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              <Dialog open={openTransferDialog === room._id} onOpenChange={closeTransferDialog}>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setOpenTransferDialog(room._id)}
                                  >
                                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                                    Transfer
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Transfer Agent</DialogTitle>
                                    <DialogDescription>
                                      Assign this chat to a different agent
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Current Agent</Label>
                                      <div className="mt-1 p-2 bg-gray-100 rounded">
                                        {room.assignedAgent?.username} ({room.assignedAgent?.email})
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label>New Agent</Label>
                                      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder="Select new agent..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableAgents
                                            .filter(agent => agent._id !== room.assignedAgent?._id)
                                            .map((agent) => (
                                            <SelectItem key={agent._id} value={agent._id}>
                                              <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                <span>{agent.username}</span>
                                                <span className="text-xs text-gray-600">
                                                  ({getAgentChatCount(agent._id)} chats)
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div>
                                      <Label>Transfer Reason</Label>
                                      <Textarea
                                        className="mt-1"
                                        placeholder="Reason for transfer..."
                                        value={transferReason}
                                        onChange={(e) => setTransferReason(e.target.value)}
                                      />
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={closeTransferDialog}
                                        disabled={isLoading}
                                        className="flex-1"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => handleTransferAgent(room._id)}
                                        disabled={!selectedAgent || !transferReason.trim() || isLoading}
                                        className="flex-1"
                                      >
                                        {isLoading ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          'Transfer'
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRemoveAgent(room._id)}
                                disabled={isLoading}
                              >
                                <UserMinus className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <div>
                                <span className="text-sm text-orange-800 font-medium">No agent assigned</span>
                                <div className="text-xs text-orange-700">This chat needs immediate attention</div>
                              </div>
                            </div>
                            
                            <Dialog open={openAssignDialog === room._id} onOpenChange={handleAssignDialogChange}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  onClick={() => setOpenAssignDialog(room._id)}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Assign Agent
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Agent</DialogTitle>
                                  <DialogDescription>
                                    Choose an agent to handle this support chat
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  <div>
                                    <Label>Available Agents</Label>
                                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                      <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select an agent..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableAgents.map((agent) => (
                                          <SelectItem key={agent._id} value={agent._id}>
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                              <span>{agent.username}</span>
                                              <span className="text-xs text-gray-600">
                                                ({getAgentChatCount(agent._id)} chats)
                                              </span>
                                              {!agent.isOnline && (
                                                <span className="text-xs text-red-600">(Offline)</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={closeAssignDialog}
                                      disabled={isLoading}
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => handleAssignAgent(room._id)}
                                      disabled={!selectedAgent || isLoading}
                                      className="flex-1"
                                    >
                                      {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        'Assign Agent'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>

                      <Separator className="my-3" />
                      
                      <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.participants.length} participants
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(room.lastActivity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  
                  {filteredChatRooms.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                      <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-10 w-10 text-emerald-600" />
                      </div>
                      <h4 className="font-semibold text-gray-700 mb-2">No Chat Rooms Found</h4>
                      <p className="text-sm text-gray-500 mb-4">Start managing conversations</p>
                      <Button variant="outline" size="sm" onClick={loadAgentWorkloads} className="shadow-sm hover:shadow-md transition-shadow">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 