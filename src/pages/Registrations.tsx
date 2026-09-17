import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Loader2, Download, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import type { Database } from '@/integrations/supabase/types';

type RegistrationType = Database['public']['Enums']['registration_type'];

const REGISTRATION_TABS: { value: RegistrationType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'course', label: 'Courses' },
  { value: 'internship', label: 'Internships' },
  { value: 'seminar', label: 'Seminars' },
  { value: 'workshop', label: 'Workshops' },
];

const STATUS_OPTIONS = ['new', 'contacted', 'converted'] as const;

export default function Registrations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<RegistrationType | 'all'>('all');
  const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const queryClient = useQueryClient();
  const { canManage } = useRoleAccess();
  const canUpdate = canManage('registrations');

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['registrations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: registrations, isLoading, refetch } = useQuery({
    queryKey: ['registrations', activeTab, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (activeTab !== 'all') {
        query = query.eq('registration_type', activeTab);
      }
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Lookup tables for reference names
  const { data: courses } = useQuery({
    queryKey: ['courses-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title');
      return data || [];
    },
  });

  const { data: internships } = useQuery({
    queryKey: ['internships-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('internships').select('id, title');
      return data || [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ['events-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('id, title');
      return data || [];
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('id, title, category');
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('registrations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update status');
      console.error(error);
    },
  });

  const getProgramName = (reg: any) => {
  const data = reg.extra_data ?? {};

  switch (reg.registration_type) {
    case 'course':
      return data.course_title ?? 'Unknown Course';
    case 'internship':
      return data.internship_title ?? 'Unknown Internship';
    case 'seminar':
      return data.seminar_title ?? 'Unknown Seminar';
    case 'workshop':
    case 'vac':
      return data.workshop_title ?? 'Unknown Workshop';
    default:
      return 'Unknown Program';
  }
};


  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      course: 'default',
      internship: 'secondary',
      event: 'outline',
      workshop: 'outline',
      seminar: 'outline',
      vac: 'secondary',
    };
    const label = type === 'vac' ? 'VAC' : type.charAt(0).toUpperCase() + type.slice(1);
    return <Badge variant={variants[type] || 'outline'}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      new: 'secondary',
      contacted: 'outline',
      converted: 'default',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleExportCSV = () => {
    if (!registrations || registrations.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Type', 'Program', 'Status', 'Message', 'Date'];
    const rows = registrations.map(reg => [
      reg.name,
      reg.email,
      reg.phone || '',
      reg.registration_type,
      getProgramName(reg),
      reg.status,
      reg.message || '',
      format(new Date(reg.created_at), 'yyyy-MM-dd HH:mm'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registrations_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleViewDetails = (reg: any) => {
    setSelectedRegistration(reg);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
          <p className="text-muted-foreground">View and manage all registrations from the website</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!registrations?.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RegistrationType | 'all')}>
        <TabsList className="grid w-full grid-cols-5">
          {REGISTRATION_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Registrations Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' ? 'All Registrations' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Registrations`}
              </CardTitle>
              <CardDescription>
                {registrations?.length || 0} registrations found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : registrations?.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No registrations found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations?.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.name}</TableCell>
                        <TableCell>{reg.email}</TableCell>
                        <TableCell className="text-muted-foreground">{reg.phone || '-'}</TableCell>
                        <TableCell>{getTypeBadge(reg.registration_type)}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={getProgramName(reg)}>
                          {getProgramName(reg)}
                        </TableCell>
                        <TableCell>
                          {canUpdate ? (
                            <Select
                              value={reg.status}
                              onValueChange={(value) => updateStatusMutation.mutate({ id: reg.id, status: value })}
                            >
                              <SelectTrigger className="w-[120px]">
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
                          ) : (
                            getStatusBadge(reg.status)
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(reg.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(reg)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Registration Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Registration Details</SheetTitle>
            <SheetDescription>
              Full details of the selected registration
            </SheetDescription>
          </SheetHeader>
          {selectedRegistration && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{selectedRegistration.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedRegistration.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedRegistration.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm capitalize">{selectedRegistration.registration_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Program</p>
                  <p className="text-sm">{getProgramName(selectedRegistration)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(selectedRegistration.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Registered At</p>
                  <p className="text-sm">{format(new Date(selectedRegistration.created_at), 'PPpp')}</p>
                </div>
              </div>
              
              {selectedRegistration.message && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Message</p>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedRegistration.message}</p>
                </div>
              )}

              {selectedRegistration.extra_data && Object.keys(selectedRegistration.extra_data).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Additional Data</p>
                  <div className="p-3 bg-muted rounded-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedRegistration.extra_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {canUpdate && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Update Status</p>
                  <Select
                    value={selectedRegistration.status}
                    onValueChange={(value) => {
                      updateStatusMutation.mutate({ id: selectedRegistration.id, status: value });
                      setSelectedRegistration({ ...selectedRegistration, status: value });
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
