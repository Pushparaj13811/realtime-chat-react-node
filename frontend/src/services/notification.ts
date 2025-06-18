class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private constructor() {
    this.initializeNotifications();
    this.initializeAudioContext();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializeNotifications(): Promise<void> {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }
    }
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext not supported:', error);
      this.audioContext = null;
    }
  }

  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    }
    return false;
  }

  showNotification(title: string, options: {
    body?: string;
    icon?: string;
    tag?: string;
    silent?: boolean;
  } = {}): void {
    if (this.permission === 'granted' && 'Notification' in window) {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        silent: options.silent || false,
        requireInteraction: false,
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  playNotificationSound(): void {
    if (!this.soundEnabled || !this.audioContext) return;

    try {
      // Create a simple notification beep
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  showNewMessageNotification(senderName: string, messageContent: string, chatRoomName?: string): void {
    const title = `New message from ${senderName}`;
    const body = chatRoomName 
      ? `${chatRoomName}: ${messageContent}`
      : messageContent;

    this.showNotification(title, {
      body: body.length > 100 ? `${body.substring(0, 100)}...` : body,
      tag: 'new-message',
      icon: '/favicon.ico'
    });

    if (this.soundEnabled) {
      this.playNotificationSound();
    }
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

export default NotificationService.getInstance(); 