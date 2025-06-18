import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  MessageSquare, 
  Flag,
  Loader2
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatRoomType } from '@/types';

interface StartChatDialogProps {
  trigger?: React.ReactNode;
  onChatStarted?: () => void;
}

export function StartChatDialog({ trigger, onChatStarted }: StartChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  
  const { createChatRoom } = useChat();
  const { state: authState } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !authState.user) {
      return;
    }

    try {
      setIsLoading(true);
      
      await createChatRoom({
        type: ChatRoomType.SUPPORT,
        participants: [], // Backend will auto-assign appropriate agent
        metadata: {
          subject: subject.trim(),
          priority: priority
        }
      });

      // Reset form
      setSubject('');
      setPriority('medium');
      setOpen(false);
      onChatStarted?.();
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    setPriority('medium');
    setOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Start Chat
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-full">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            Start New Support Chat
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Tell us about your inquiry so we can connect you with the right support agent. 
            Please provide as much detail as possible to help us assist you better.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject/Topic */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <label htmlFor="subject" className="text-base font-semibold leading-none flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              What can we help you with? *
            </label>
            <Textarea
              id="subject"
              placeholder="Please describe your issue or question in detail. The more information you provide, the better we can assist you..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="min-h-[100px] resize-none text-base"
              required
            />
          </div>

          {/* Priority Selection */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <label className="text-base font-semibold leading-none flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              Priority
            </label>
            <Select 
              value={priority} 
              onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high' | 'urgent')}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" className="text-base">
                  <span className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <div className="font-medium">Low</div>
                      <div className="text-xs text-muted-foreground">General inquiry</div>
                    </div>
                  </span>
                </SelectItem>
                <SelectItem value="medium" className="text-base">
                  <span className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div>
                      <div className="font-medium">Medium</div>
                      <div className="text-xs text-muted-foreground">Need assistance</div>
                    </div>
                  </span>
                </SelectItem>
                <SelectItem value="high" className="text-base">
                  <span className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <div>
                      <div className="font-medium">High</div>
                      <div className="text-xs text-muted-foreground">Affecting productivity</div>
                    </div>
                  </span>
                </SelectItem>
                <SelectItem value="urgent" className="text-base">
                  <span className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div>
                      <div className="font-medium">Urgent</div>
                      <div className="text-xs text-muted-foreground">Critical issue</div>
                    </div>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !subject.trim()}
              className="flex-1 h-12 text-base font-semibold"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Chat...
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Start Chat
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 rounded-full">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Quick Start Guide:</p>
              <ul className="mt-2 space-y-1 text-blue-700">
                <li>• We'll connect you with an available support agent</li>
                <li>• You can request a transfer to another agent if needed</li>
                <li>• Our team typically responds within 2-5 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 