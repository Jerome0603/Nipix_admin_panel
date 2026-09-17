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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface InstructorFormData {
  name: string;
  email: string;
  status: string;
}

export default function Instructors() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<string | null>(null);
  const [formData, setFormData] = useState<InstructorFormData>({
    name: '',
    email: '',
    status: 'active',
  });

  const { isSuperAdmin } = useRoleAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: instructors, isLoading } = useQuery({
    queryKey: ['instructors', searchTerm],
    queryFn: async () => {
      let query = supabase.from('instructors').select('*').order('created_at', { ascending: false });
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: courseAssignments } = useQuery({
    queryKey: ['instructor-course-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_instructors')
        .select('instructor_id, courses(title)');
      
      if (error) throw error;
      
      const assignments: Record<string, string[]> = {};
      data.forEach((a) => {
        if (!assignments[a.instructor_id]) {
          assignments[a.instructor_id] = [];
        }
        if (a.courses) {
          assignments[a.instructor_id].push((a.courses as any).title);
        }
      });
      
      return assignments;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InstructorFormData) => {
      const { error } = await supabase.from('instructors').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      toast({ title: 'Instructor added successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error adding instructor', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InstructorFormData }) => {
      const { error } = await supabase.from('instructors').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      toast({ title: 'Instructor updated successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error updating instructor', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instructors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      toast({ title: 'Instructor removed successfully' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error removing instructor', description: error.message });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingInstructor(null);
    setFormData({ name: '', email: '', status: 'active' });
  };

  const handleEdit = (instructor: any) => {
    setEditingInstructor(instructor.id);
    setFormData({
      name: instructor.name,
      email: instructor.email,
      status: instructor.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstructor) {
      updateMutation.mutate({ id: editingInstructor, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructors</h1>
          <p className="text-muted-foreground">Manage instructors and course assignments</p>
        </div>
        {isSuperAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Instructor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingInstructor ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search instructors..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instructor List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : instructors?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No instructors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Courses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors?.map((instructor) => {
                  const courses = courseAssignments?.[instructor.id] || [];
                  
                  return (
                    <TableRow key={instructor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{instructor.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{instructor.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{instructor.email}</TableCell>
                      <TableCell>
                        {courses.length === 0 ? (
                          <span className="text-muted-foreground">No courses</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {courses.slice(0, 2).map((c, i) => (
                              <Badge key={i} variant="secondary">{c}</Badge>
                            ))}
                            {courses.length > 2 && (
                              <Badge variant="outline">+{courses.length - 2} more</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={instructor.status === 'active' ? 'default' : 'secondary'}>
                          {instructor.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(instructor.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(instructor)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(instructor.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
