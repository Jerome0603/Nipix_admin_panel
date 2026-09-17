import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2, X } from 'lucide-react';

interface VACForm {
  title: string;
  slug: string;
  description: string;
  long_description: string;
  duration: string;
  level: string;
  students: string;
  rating: string;
  instructor: string;
  price: number;
  image_url: string;
  status: string;
}

const emptyForm: VACForm = {
  title: '', slug: '', description: '', long_description: '', duration: '',
  level: '', students: '', rating: '', instructor: '', price: 0,
  image_url: '', status: 'draft',
};

export default function VACPrograms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VACForm>(emptyForm);
  const [activeTab, setActiveTab] = useState('basic');

  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [curriculum, setCurriculum] = useState<any[]>([]);

  const { data: programs, isLoading } = useQuery({
    queryKey: ['vac_programs', searchTerm, statusFilter],
    queryFn: async () => {
      let q = supabase.from('vac_programs').select('*').order('created_at', { ascending: false });
      if (searchTerm) q = q.ilike('title', `%${searchTerm}%`);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as 'draft' | 'published' | 'archived');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const loadRelated = async (id: string) => {
    const { data: currData } = await supabase.from('vac_curriculum').select('*, vac_lessons(*)').eq('vac_id', id).order('sort_order');
    setCurriculum((currData || []).map((c: any) => ({
      ...c,
      lessons: c.vac_lessons?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)) || [],
    })));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form } as any;
      let vacId = editingId;

      if (editingId) {
        const { error } = await supabase.from('vac_programs').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('vac_programs').insert([payload]).select('id').single();
        if (error) throw error;
        vacId = data.id;
      }

      // Save curriculum + lessons
      await supabase.from('vac_curriculum').delete().eq('vac_id', vacId!);
      for (let i = 0; i < curriculum.length; i++) {
        const mod = curriculum[i];
        const { data: modData } = await supabase.from('vac_curriculum').insert({
          vac_id: vacId!, title: mod.title, description: mod.description, sort_order: i,
        }).select('id').single();
        if (modData && mod.lessons?.length) {
          await supabase.from('vac_lessons').insert(
            mod.lessons.map((l: any, j: number) => ({
              curriculum_id: modData.id, title: l.title, description: l.description, duration: l.duration, sort_order: j,
            }))
          );
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vac_programs'] }); toast({ title: editingId ? 'VAC Program updated' : 'VAC Program created' }); closeSheet(); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('vac_programs').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vac_programs'] }); toast({ title: 'VAC Program deleted' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setCurriculum([]); setActiveTab('basic'); setIsSheetOpen(true); };

  const openEdit = async (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title || '', slug: p.slug || '', description: p.description || '',
      long_description: p.long_description || '', duration: p.duration || '',
      level: p.level || '', students: p.students || '', rating: p.rating || '',
      instructor: p.instructor || '', price: p.price || 0, image_url: p.image_url || '',
      status: p.status || 'draft',
    });
    await loadRelated(p.id);
    setActiveTab('basic');
    setIsSheetOpen(true);
  };

  const closeSheet = () => { setIsSheetOpen(false); setEditingId(null); setForm(emptyForm); setCurriculum([]); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge variant="default">Published</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'archived': return <Badge variant="outline">Archived</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VAC Programs</h1>
          <p className="text-muted-foreground">Manage Value Added Courses</p>
        </div>
        {canManage('programs') && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add VAC Program</Button>}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search VAC programs..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
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

      <Card>
        <CardHeader><CardTitle>VAC Program List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : programs?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No VAC programs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage('programs') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell><Badge variant="outline">{p.level || '-'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{p.price || 0}</TableCell>
                    <TableCell className="text-muted-foreground">{p.instructor || '-'}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    {canManage('programs') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          {canDelete('programs') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete VAC Program?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{p.title}" and all curriculum data.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{editingId ? 'Edit VAC Program' : 'Create VAC Program'}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} /></div>
                <div className="space-y-2"><Label>Long Description</Label><Textarea value={form.long_description} onChange={(e) => setForm({...form, long_description: e.target.value})} rows={5} /></div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} placeholder="e.g., 6 weeks" /></div>
                  <div className="space-y-2"><Label>Level</Label><Input value={form.level} onChange={(e) => setForm({...form, level: e.target.value})} placeholder="e.g., Beginner" /></div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: Number(e.target.value)})} /></div>
                  <div className="space-y-2"><Label>Students</Label><Input value={form.students} onChange={(e) => setForm({...form, students: e.target.value})} placeholder="e.g., 200+" /></div>
                  <div className="space-y-2"><Label>Rating</Label><Input value={form.rating} onChange={(e) => setForm({...form, rating: e.target.value})} placeholder="e.g., 4.8" /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Instructor</Label><Input value={form.instructor} onChange={(e) => setForm({...form, instructor: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} /></div>
                </div>
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Day-wise Curriculum</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCurriculum([...curriculum, { module: '', lessons: [] }])}>
                    <Plus className="mr-1 h-3 w-3" />Add Day
                  </Button>
                </div>
                {curriculum.map((mod, mi) => (
                  <Card key={mi}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Day {mi + 1}</h4>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setCurriculum(curriculum.filter((_, i) => i !== mi))}><X className="h-4 w-4" /></Button>
                      </div>
                      <div className="space-y-1"><Label>Module</Label><Input value={mod.module} onChange={(e) => {
                        const u = [...curriculum]; u[mi] = { ...u[mi], module: e.target.value }; setCurriculum(u);
                      }} /></div>

                      <div className="ml-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Lessons</span>
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            const u = [...curriculum]; u[mi] = { ...u[mi], lessons: [...(u[mi].lessons || []), { lesson: '', module: ''}] }; setCurriculum(u);
                          }}><Plus className="mr-1 h-3 w-3" />Add Lesson</Button>
                        </div>
                        {(mod.lessons || []).map((l: any, li: number) => (
                          <Card key={li} className="bg-muted/30">
                            <CardContent className="pt-3 space-y-2">
                              <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => {
                                const u = [...curriculum]; u[mi] = { ...u[mi], lessons: u[mi].lessons.filter((_: any, i: number) => i !== li) }; setCurriculum(u);
                              }}><X className="h-3 w-3" /></Button></div>
                              <div className="space-y-1"><Label>Lesson {li + 1}</Label><Textarea value={l.lesson || ''} onChange={(e) => {
                                const u = [...curriculum]; u[mi].lessons[li] = { ...u[mi].lessons[li], lesson: e.target.value }; setCurriculum(u);
                              }} rows={1} /></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {curriculum.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No curriculum modules yet</p>}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeSheet}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update Program' : 'Create Program'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
