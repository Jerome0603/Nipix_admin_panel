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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type ProgramCategory = 'workshop' | 'seminar' | 'vac';
type EventMode = 'online' | 'offline' | 'hybrid';
type CourseStatus = 'draft' | 'published' | 'archived';

interface ProgramFormData {
  title: string;
  category: ProgramCategory;
  duration: string;
  mode: EventMode;
  description: string;
  status: CourseStatus;
  certificate_enabled: boolean;
}

export default function Programs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProgramFormData>({
    title: '',
    category: 'workshop',
    duration: '',
    mode: 'online',
    description: '',
    status: 'draft',
    certificate_enabled: false,
  });

  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs', searchTerm, categoryFilter],
    queryFn: async () => {
      let query = supabase.from('programs').select('*').order('created_at', { ascending: false });
      
      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }
      
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter as ProgramCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProgramFormData) => {
      const { error } = await supabase.from('programs').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Program created successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error creating program', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProgramFormData }) => {
      const { error } = await supabase.from('programs').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Program updated successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error updating program', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({ title: 'Program deleted successfully' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error deleting program', description: error.message });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProgram(null);
    setFormData({
      title: '',
      category: 'workshop',
      duration: '',
      mode: 'online',
      description: '',
      status: 'draft',
      certificate_enabled: false,
    });
  };

  const handleEdit = (program: any) => {
    setEditingProgram(program.id);
    setFormData({
      title: program.title,
      category: program.category,
      duration: program.duration || '',
      mode: program.mode,
      description: program.description || '',
      status: program.status,
      certificate_enabled: program.certificate_enabled,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram, data: formData });
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

  const getCategoryBadge = (category: ProgramCategory) => {
    switch (category) {
      case 'workshop':
        return <Badge variant="outline" className="border-primary/30 text-primary">Workshop</Badge>;
      case 'seminar':
        return <Badge variant="outline" className="border-primary/50 text-primary">Seminar</Badge>;
      case 'vac':
        return <Badge variant="outline" className="border-primary text-primary">VAC</Badge>;
    }
  };

  const getModeBadge = (mode: EventMode) => {
    switch (mode) {
      case 'online':
        return <Badge variant="secondary">Online</Badge>;
      case 'hybrid':
        return <Badge variant="secondary">Hybrid</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workshops / Seminars / VAC</h1>
          <p className="text-muted-foreground">Manage workshops, seminars, and value-added courses</p>
        </div>
        {canManage('programs') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProgram ? 'Edit Program' : 'Add New Program'}</DialogTitle>
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
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as ProgramCategory })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                        <SelectItem value="vac">VAC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      placeholder="e.g., 2 days"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="certificate"
                    checked={formData.certificate_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, certificate_enabled: checked })}
                  />
                  <Label htmlFor="certificate">Enable Certificate</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProgram ? 'Update' : 'Create'}
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
                placeholder="Search programs..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="seminar">Seminar</SelectItem>
                <SelectItem value="vac">VAC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Program List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : programs?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No programs found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage('programs') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs?.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.title}</TableCell>
                    <TableCell>{getCategoryBadge(program.category as ProgramCategory)}</TableCell>
                    <TableCell>{program.duration || '-'}</TableCell>
                    <TableCell>{getModeBadge(program.mode as EventMode)}</TableCell>
                    <TableCell>{getStatusBadge(program.status as CourseStatus)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(program.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    {canManage('programs') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(program)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete('programs') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(program.id)}
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
    </div>
  );
}