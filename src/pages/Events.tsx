import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2, Settings, Users } from 'lucide-react';
import { format } from 'date-fns';

type EventMode = 'online' | 'offline' | 'hybrid';
type CourseStatus = 'draft' | 'published' | 'archived';

interface EventFormData {
  title: string;
  subtitle: string;
  event_date: string;
  event_time: string;
  mode: EventMode;
  location: string;
  capacity: number;
  registration_open: boolean;
  certificate_enabled: boolean;
  status: CourseStatus;
  description: string;
}

export default function Events() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    subtitle: '',
    event_date: '',
    event_time: '',
    mode: 'online',
    location: '',
    capacity: 0,
    registration_open: true,
    certificate_enabled: false,
    status: 'draft',
    description: '',
  });

  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase.from('events').select('*').order('created_at', { ascending: false });
      
      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as CourseStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: eventRegistrations } = useQuery({
    queryKey: ['event-registrations', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('registration_type', 'event')
        .eq('reference_id', selectedEvent)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEvent,
  });

  const { data: scheduleDays } = useQuery({
    queryKey: ['event-schedule', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data, error } = await supabase
        .from('event_schedule_days')
        .select('*, event_sessions(*)')
        .eq('event_id', selectedEvent)
        .order('day_number');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEvent,
  });

  const { data: problemStatements } = useQuery({
    queryKey: ['event-problems', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data, error } = await supabase
        .from('event_problem_statements')
        .select('*')
        .eq('event_id', selectedEvent)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEvent,
  });

  const { data: prizes } = useQuery({
    queryKey: ['event-prizes', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data, error } = await supabase
        .from('event_prizes')
        .select('*')
        .eq('event_id', selectedEvent)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEvent,
  });

  const { data: faqs } = useQuery({
    queryKey: ['event-faqs', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data, error } = await supabase
        .from('event_faqs')
        .select('*')
        .eq('event_id', selectedEvent)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEvent,
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const { error } = await supabase.from('events').insert([{
        ...data,
        event_date: data.event_date || null,
        event_time: data.event_time || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Event created successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error creating event', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormData }) => {
      const { error } = await supabase.from('events').update({
        ...data,
        event_date: data.event_date || null,
        event_time: data.event_time || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Event updated successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error updating event', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Event deleted successfully' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error deleting event', description: error.message });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      subtitle: '',
      event_date: '',
      event_time: '',
      mode: 'online',
      location: '',
      capacity: 0,
      registration_open: true,
      certificate_enabled: false,
      status: 'draft',
      description: '',
    });
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event.id);
    setFormData({
      title: event.title,
      subtitle: event.subtitle || '',
      event_date: event.event_date || '',
      event_time: event.event_time || '',
      mode: event.mode,
      location: event.location || '',
      capacity: event.capacity || 0,
      registration_open: event.registration_open,
      certificate_enabled: event.certificate_enabled,
      status: event.status,
      description: event.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case 'published':
        return <Badge variant="default">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
    }
  };

  const getModeBadge = (mode: EventMode) => {
    switch (mode) {
      case 'online':
        return <Badge variant="outline" className="border-primary/30 text-primary">Online</Badge>;
      case 'hybrid':
        return <Badge variant="outline" className="border-primary/50 text-primary">Hybrid</Badge>;
      case 'offline':
        return <Badge variant="outline" className="border-primary text-primary">Offline</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events & Hackathons</h1>
          <p className="text-muted-foreground">Manage events, hackathons, and competitions</p>
        </div>
        {canManage('events') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle">Subtitle</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="event_date">Date</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_time">Time</Label>
                    <Input
                      id="event_time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mode">Mode</Label>
                    <Select value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v as EventMode })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="Venue or online platform"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as CourseStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="registration"
                      checked={formData.registration_open}
                      onCheckedChange={(checked) => setFormData({ ...formData, registration_open: checked })}
                    />
                    <Label htmlFor="registration">Registration Open</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="certificate"
                      checked={formData.certificate_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, certificate_enabled: checked })}
                    />
                    <Label htmlFor="certificate">Enable Certificate</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingEvent ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Event List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No events found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage('events') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {events?.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>{getModeBadge(event.mode as EventMode)}</TableCell>
                    <TableCell>{event.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={event.registration_open ? 'default' : 'secondary'}>
                        {event.registration_open ? 'Open' : 'Closed'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(event.status as CourseStatus)}</TableCell>
                    {canManage('events') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(event.id)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete('events') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(event.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Event Details Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Event Details</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="registrations" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="registrations">Registrations</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="problems">Problems</TabsTrigger>
              <TabsTrigger value="prizes">Prizes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="registrations" className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{eventRegistrations?.length || 0} registrations</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventRegistrations?.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>{reg.name}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{reg.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              {scheduleDays?.map((day: any) => (
                <Card key={day.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Day {day.day_number}: {day.day_title}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <ul className="space-y-2">
                      {day.event_sessions?.map((session: any) => (
                        <li key={session.id} className="text-sm">
                          <span className="font-medium">{session.title}</span>
                          {session.speaker && <span className="text-muted-foreground"> - {session.speaker}</span>}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
              {(!scheduleDays || scheduleDays.length === 0) && (
                <p className="text-sm text-muted-foreground">No schedule configured</p>
              )}
            </TabsContent>

            <TabsContent value="problems" className="space-y-4">
              {problemStatements?.map((problem) => (
                <Card key={problem.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{problem.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">{problem.description}</p>
                    {problem.difficulty && (
                      <Badge variant="outline" className="mt-2">{problem.difficulty}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!problemStatements || problemStatements.length === 0) && (
                <p className="text-sm text-muted-foreground">No problem statements configured</p>
              )}
            </TabsContent>

            <TabsContent value="prizes" className="space-y-4">
              {prizes?.map((prize) => (
                <div key={prize.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <p className="font-medium">{prize.position}</p>
                    {prize.description && <p className="text-sm text-muted-foreground">{prize.description}</p>}
                  </div>
                  <span className="font-semibold text-primary">{prize.prize_amount}</span>
                </div>
              ))}
              {(!prizes || prizes.length === 0) && (
                <p className="text-sm text-muted-foreground">No prizes configured</p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
