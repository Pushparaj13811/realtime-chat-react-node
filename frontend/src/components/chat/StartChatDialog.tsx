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
  Building, 
  AlertTriangle, 
  Flag,
  Loader2
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatRoomType, Department, ProblemType } from '@/types';

interface StartChatDialogProps {
  trigger?: React.ReactNode;
  onChatStarted?: () => void;
}

const departmentLabels: Record<Department, string> = {
  [Department.TECHNICAL_SUPPORT]: 'Technical Support',
  [Department.BILLING]: 'Billing & Payments',
  [Department.SALES]: 'Sales & Pricing',
  [Department.GENERAL_SUPPORT]: 'General Support',
  [Department.ACCOUNT_MANAGEMENT]: 'Account Management',
  [Department.UNKNOWN]: 'Not Sure',
  [Department.OTHER]: 'Other'
};

const problemTypeLabels: Record<ProblemType, string> = {
  // Technical Support
  [ProblemType.TECHNICAL_ISSUE]: 'Technical Issue',
  [ProblemType.BUG_REPORT]: 'Bug Report',
  [ProblemType.FEATURE_REQUEST]: 'Feature Request',
  [ProblemType.INSTALLATION_HELP]: 'Installation Help',
  
  // Billing
  [ProblemType.PAYMENT_ISSUE]: 'Payment Issue',
  [ProblemType.REFUND_REQUEST]: 'Refund Request',
  [ProblemType.BILLING_INQUIRY]: 'Billing Inquiry',
  [ProblemType.SUBSCRIPTION_CHANGE]: 'Subscription Change',
  
  // Sales
  [ProblemType.PRODUCT_INQUIRY]: 'Product Inquiry',
  [ProblemType.QUOTE_REQUEST]: 'Quote Request',
  [ProblemType.DEMO_REQUEST]: 'Demo Request',
  [ProblemType.PRICING_QUESTION]: 'Pricing Question',
  
  // General
  [ProblemType.GENERAL_QUESTION]: 'General Question',
  [ProblemType.COMPLAINT]: 'Complaint',
  [ProblemType.FEEDBACK]: 'Feedback',
  
  // Account Management
  [ProblemType.ACCOUNT_ACCESS]: 'Account Access',
  [ProblemType.PROFILE_UPDATE]: 'Profile Update',
  [ProblemType.DATA_REQUEST]: 'Data Request',
  
  // Other
  [ProblemType.OTHER]: 'Other'
};

const problemTypesByDepartment: Record<Department, ProblemType[]> = {
  [Department.TECHNICAL_SUPPORT]: [
    ProblemType.TECHNICAL_ISSUE,
    ProblemType.BUG_REPORT,
    ProblemType.FEATURE_REQUEST,
    ProblemType.INSTALLATION_HELP,
    ProblemType.OTHER
  ],
  [Department.BILLING]: [
    ProblemType.PAYMENT_ISSUE,
    ProblemType.REFUND_REQUEST,
    ProblemType.BILLING_INQUIRY,
    ProblemType.SUBSCRIPTION_CHANGE,
    ProblemType.OTHER
  ],
  [Department.SALES]: [
    ProblemType.PRODUCT_INQUIRY,
    ProblemType.QUOTE_REQUEST,
    ProblemType.DEMO_REQUEST,
    ProblemType.PRICING_QUESTION,
    ProblemType.OTHER
  ],
  [Department.GENERAL_SUPPORT]: [
    ProblemType.GENERAL_QUESTION,
    ProblemType.COMPLAINT,
    ProblemType.FEEDBACK,
    ProblemType.OTHER
  ],
  [Department.ACCOUNT_MANAGEMENT]: [
    ProblemType.ACCOUNT_ACCESS,
    ProblemType.PROFILE_UPDATE,
    ProblemType.DATA_REQUEST,
    ProblemType.OTHER
  ],
  [Department.UNKNOWN]: [
    ProblemType.GENERAL_QUESTION,
    ProblemType.OTHER
  ],
  [Department.OTHER]: [
    ProblemType.OTHER
  ]
};

export function StartChatDialog({ trigger, onChatStarted }: StartChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState<Department | ''>('');
  const [problemType, setProblemType] = useState<ProblemType | ''>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  
  const { createChatRoom } = useChat();
  const { state: authState } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !department || !problemType || !authState.user) {
      return;
    }

    try {
      setIsLoading(true);
      
      await createChatRoom({
        type: ChatRoomType.SUPPORT,
        participants: [], // Backend will auto-assign appropriate agent
        metadata: {
          subject: subject.trim(),
          department: department as Department,
          problemType: problemType as ProblemType,
          priority,
          customerInfo: {
            name: authState.user.username,
            email: authState.user.email
          }
        }
      });

      // Reset form
      setSubject('');
      setDepartment('');
      setProblemType('');
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
    setDepartment('');
    setProblemType('');
    setPriority('medium');
    setOpen(false);
  };

  const availableProblemTypes = department ? problemTypesByDepartment[department as Department] : [];

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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Start New Support Chat
          </DialogTitle>
          <DialogDescription>
            Tell us about your inquiry so we can connect you with the right specialist
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject/Topic */}
          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium leading-none">
              What can we help you with? *
            </label>
            <Textarea
              id="subject"
              placeholder="Brief description of your issue or question..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="min-h-[80px] resize-none"
              required
            />
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Building className="h-4 w-4" />
              Department *
            </label>
            <Select 
              value={department} 
              onValueChange={(value) => {
                setDepartment(value as Department);
                setProblemType(''); // Reset problem type when department changes
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select the most relevant department" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(departmentLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Problem Type Selection */}
          {department && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issue Type *
              </label>
              <Select 
                value={problemType} 
                onValueChange={(value) => setProblemType(value as ProblemType)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the type of issue" />
                </SelectTrigger>
                <SelectContent>
                  {availableProblemTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {problemTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Priority
            </label>
            <Select 
              value={priority} 
              onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high' | 'urgent')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Low - General inquiry
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Medium - Need assistance
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    High - Affecting productivity
                  </span>
                </SelectItem>
                <SelectItem value="urgent">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Urgent - Critical issue
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !subject.trim() || !department || !problemType}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Start Chat'
              )}
            </Button>
          </div>
        </form>

        {/* Info Message */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 We'll automatically connect you with a specialist from the selected department. 
          You can transfer to another department if needed during the conversation.
        </div>
      </DialogContent>
    </Dialog>
  );
} 