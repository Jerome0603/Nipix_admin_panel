import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Loader2, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRoleAccess } from '@/hooks/useRoleAccess';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = ['new', 'replied'] as const;

export default function ContactMessages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const queryClient = useQueryClient();
  const { canManage } = useRoleAccess();
  const canUpdate = canManage('contact_messages');

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('contact-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contact_messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: messages, isLoading, refetch, error } = useQuery({
    queryKey: ['contact_messages', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_messages'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update status');
      console.error(error);
    },
  });

  const getStatusBadge = (status: string) => {
    if (status === 'new') {
      return <Badge variant="secondary">New</Badge>;
    }
    return <Badge variant="outline">Replied</Badge>;
  };

  const handleViewDetails = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setIsDetailOpen(true);
  };

  const handleMarkAsReplied = (id: string) => {
    updateStatusMutation.mutate({ id, status: 'replied' });
  };

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-destructive">Failed to load contact messages. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Messages</h1>
          <p className="text-muted-foreground">View and manage contact form submissions from the website</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or subject..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Messages</CardTitle>
          <CardDescription>
            {messages?.length || 0} messages found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No contact messages yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages?.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium">{msg.name}</TableCell>
                    <TableCell>{msg.email}</TableCell>
                    <TableCell className="text-muted-foreground">{msg.phone || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={msg.subject}>
                      {msg.subject}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={msg.message}>
                      {msg.message}
                    </TableCell>
                    <TableCell>{getStatusBadge(msg.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(msg.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(msg)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canUpdate && msg.status === 'new' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleMarkAsReplied(msg.id)}
                            title="Mark as Replied"
                          >
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Message Details</SheetTitle>
            <SheetDescription>
              Full details of the contact message
            </SheetDescription>
          </SheetHeader>
          {selectedMessage && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{selectedMessage.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedMessage.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedMessage.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(selectedMessage.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Subject</p>
                  <p className="text-sm">{selectedMessage.subject}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Received At</p>
                  <p className="text-sm">{format(new Date(selectedMessage.created_at), 'PPpp')}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Message</p>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {canUpdate && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Update Status</p>
                  <Select
                    value={selectedMessage.status}
                    onValueChange={(value) => {
                      updateStatusMutation.mutate({ id: selectedMessage.id, status: value });
                      setSelectedMessage({ ...selectedMessage, status: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
