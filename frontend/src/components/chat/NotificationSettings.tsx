import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import notificationService from '@/services/notification';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    setPermissionStatus(notificationService.getPermissionStatus());
    setSoundEnabled(notificationService.isSoundEnabled());
  }, []);

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await notificationService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    notificationService.setSoundEnabled(enabled);
  };

  const testNotification = () => {
    notificationService.showNewMessageNotification(
      'Test User',
      'This is a test notification message to verify everything is working correctly.',
      'Test Chat Room'
    );
  };

  const getPermissionStatusColor = (status: NotificationPermission) => {
    switch (status) {
      case 'granted':
        return 'text-green-600';
      case 'denied':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getPermissionStatusText = (status: NotificationPermission) => {
    switch (status) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Blocked';
      default:
        return 'Not set';
    }
  };

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h3 className="font-semibold">Notification Settings</h3>
      </div>

      <div className="space-y-3">
        {/* Browser Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {permissionStatus === 'granted' ? (
              <Bell className="h-4 w-4 text-green-600" />
            ) : (
              <BellOff className="h-4 w-4 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium">Browser Notifications</p>
              <p className={`text-xs ${getPermissionStatusColor(permissionStatus)}`}>
                {getPermissionStatusText(permissionStatus)}
              </p>
            </div>
          </div>
          
          {permissionStatus !== 'granted' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestPermission}
              disabled={isRequestingPermission}
            >
              {isRequestingPermission ? 'Requesting...' : 'Enable'}
            </Button>
          )}
        </div>

        {/* Sound Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-blue-600" />
            ) : (
              <VolumeX className="h-4 w-4 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium">Sound Alerts</p>
              <p className="text-xs text-gray-500">
                Play sound when receiving messages
              </p>
            </div>
          </div>
          
          <Button
            size="sm"
            variant={soundEnabled ? "default" : "outline"}
            onClick={() => handleSoundToggle(!soundEnabled)}
          >
            {soundEnabled ? "On" : "Off"}
          </Button>
        </div>

        {/* Test Button */}
        {permissionStatus === 'granted' && (
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="secondary"
              onClick={testNotification}
              className="w-full"
            >
              Test Notification
            </Button>
          </div>
        )}
      </div>

      {permissionStatus === 'denied' && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          Notifications are blocked. Please enable them in your browser settings to receive alerts when you're not actively viewing the chat.
        </div>
      )}
    </Card>
  );
} 