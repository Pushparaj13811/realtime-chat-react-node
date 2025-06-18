import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Activity,
  Users,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import type { User, ChatRoom } from '@/types';
import apiService from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

interface AgentWorkloadDashboardProps {
  onBack: () => void;
}

interface AgentWorkloadStats {
  totalChats: number;
  activeChats: number;
  avgResponseTime: number;
  completedToday: number;
}

interface ChatRoomStats {
  totalRooms: number;
  activeRooms: number;
  avgMessagesPerRoom: number;
  totalMessages: number;
  roomsByType: Record<string, number>;
  roomsByStatus: Record<string, number>;
}

interface AgentPerformance extends User {
  workloadStats?: AgentWorkloadStats;
  activeChatRooms?: ChatRoom[];
}

export function AgentWorkloadDashboard({ onBack }: AgentWorkloadDashboardProps) {
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [chatRoomStats, setChatRoomStats] = useState<ChatRoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [fromChatRoom, setFromChatRoom] = useState<string>('');
  const [toChatRoom, setToChatRoom] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const { state } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsResponse, statsResponse] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getChatRoomStats()
      ]);

      if (agentsResponse.success && agentsResponse.data) {
        const agentUsers = agentsResponse.data.filter(user => user.role === UserRole.AGENT);
        
        // Fetch workload stats for each agent
        const agentsWithStats = await Promise.all(
          agentUsers.map(async (agent) => {
            try {
              const [workloadResponse, chatRoomsResponse] = await Promise.all([
                apiService.getAgentWorkloadStats(),
                apiService.getAgentChatRooms('active')
              ]);
              
              return {
                ...agent,
                workloadStats: workloadResponse.success ? workloadResponse.data : undefined,
                activeChatRooms: chatRoomsResponse.success ? chatRoomsResponse.data : []
              };
            } catch (error) {
              console.error(`Error fetching stats for agent ${agent.username}:`, error);
              return {
                ...agent,
                workloadStats: undefined,
                activeChatRooms: []
              };
            }
          })
        );
        
        setAgents(agentsWithStats);
      }

      if (statsResponse.success && statsResponse.data) {
        setChatRoomStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching workload data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.user?.role === UserRole.ADMIN) {
      fetchData();
    }
  }, [state.user]);

  const handleTransferAgent = async () => {
    if (!selectedAgent || !fromChatRoom || !toChatRoom || !transferReason.trim()) return;

    try {
      setTransferring(selectedAgent._id);
      const response = await apiService.transferAgentBetweenChats(fromChatRoom, toChatRoom, selectedAgent._id);
      
      if (response.success) {
        await fetchData(); // Refresh data
        setTransferDialogOpen(false);
        setFromChatRoom('');
        setToChatRoom('');
        setTransferReason('');
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error('Error transferring agent:', error);
    } finally {
      setTransferring(null);
    }
  };

  const getWorkloadLevel = (activeChats: number): { level: string; color: string } => {
    if (activeChats === 0) return { level: 'Idle', color: 'text-gray-500' };
    if (activeChats <= 3) return { level: 'Light', color: 'text-green-600' };
    if (activeChats <= 6) return { level: 'Moderate', color: 'text-yellow-600' };
    if (activeChats <= 10) return { level: 'Heavy', color: 'text-orange-600' };
    return { level: 'Overloaded', color: 'text-red-600' };
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-red-100 text-red-800';
      case 'away': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Verify admin access
  if (!state.user || state.user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You need administrator privileges to access this dashboard.</p>
            <Button onClick={onBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Panel
              </Button>
              <div className="flex items-center space-x-2">
                <Activity className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Agent Workload Dashboard</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overall Stats */}
        {chatRoomStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Chat Rooms</p>
                    <p className="text-2xl font-bold">{chatRoomStats.totalRooms}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Rooms</p>
                    <p className="text-2xl font-bold text-green-600">{chatRoomStats.activeRooms}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Messages</p>
                    <p className="text-2xl font-bold text-purple-600">{chatRoomStats.totalMessages}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Messages/Room</p>
                    <p className="text-2xl font-bold text-orange-600">{Math.round(chatRoomStats.avgMessagesPerRoom)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agent List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Agent Performance ({agents.length} agents)</span>
              <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!selectedAgent}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Transfer Agent
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer Agent Between Chats</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">From Chat Room</label>
                      <Select value={fromChatRoom} onValueChange={setFromChatRoom}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source chat room" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedAgent?.activeChatRooms?.map((room) => (
                            <SelectItem key={room._id} value={room._id}>
                              {room.name || `Chat ${room._id.slice(-6)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">To Chat Room</label>
                      <Input
                        placeholder="Enter target chat room ID"
                        value={toChatRoom}
                        onChange={(e) => setToChatRoom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Transfer Reason</label>
                      <Input
                        placeholder="Reason for transfer..."
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleTransferAgent}
                        disabled={!fromChatRoom || !toChatRoom || !transferReason.trim() || !!transferring}
                      >
                        {transferring ? 'Transferring...' : 'Transfer'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No agents found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => {
                  const workload = getWorkloadLevel(agent.activeChatRooms?.length || 0);
                  const isSelected = selectedAgent?._id === agent._id;
                  
                  return (
                    <div
                      key={agent._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAgent(isSelected ? null : agent)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="font-medium">{agent.username}</span>
                          </div>
                          <Badge className={getStatusBadgeColor(agent.status)}>
                            {agent.status || 'Offline'}
                          </Badge>
                          {agent.department && (
                            <Badge variant="outline">{agent.department}</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="text-center">
                            <p className={`font-semibold ${workload.color}`}>{agent.activeChatRooms?.length || 0}</p>
                            <p className="text-gray-500">Active Chats</p>
                          </div>
                          <div className="text-center">
                            <p className={`font-semibold ${workload.color}`}>{workload.level}</p>
                            <p className="text-gray-500">Workload</p>
                          </div>
                          {agent.workloadStats && (
                            <div className="text-center">
                              <p className="font-semibold text-blue-600">{agent.workloadStats.completedToday}</p>
                              <p className="text-gray-500">Completed Today</p>
                            </div>
                          )}
                          {agent.lastSeen && (
                            <div className="text-center">
                              <p className="font-semibold text-gray-600">
                                {formatDistanceToNow(new Date(agent.lastSeen), { addSuffix: true })}
                              </p>
                              <p className="text-gray-500">Last Seen</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && agent.activeChatRooms && agent.activeChatRooms.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-2">Active Chat Rooms:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {agent.activeChatRooms.map((room) => (
                              <div key={room._id} className="text-sm bg-white p-3 rounded border">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {room.name || `Chat ${room._id.slice(-6)}`}
                                  </span>
                                  <Badge variant="outline">{room.type}</Badge>
                                </div>
                                <p className="text-gray-500 mt-1">
                                  {room.participants.length} participants
                                </p>
                                {room.lastActivity && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Last activity: {formatDistanceToNow(new Date(room.lastActivity), { addSuffix: true })}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 