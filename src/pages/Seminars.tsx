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
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';

interface SeminarForm {
  title: string;
  subtitle: string;
  slug: string;
  type: string;
  featured: boolean;
  description: string;
  long_description: string;
  date: string;
  time: string;
  mode: string;
  location: string;
  image_url: string;
  main_speaker: string;
  participants: string;
  status: string;
}

const emptySeminarForm: SeminarForm = {
  title: '', subtitle: '', slug: '', type: 'technical', featured: false,
  description: '', long_description: '', date: '', time: '', mode: 'online',
  location: '', image_url: '', main_speaker: '', participants: '', status: 'draft',
};

export default function Seminars() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SeminarForm>(emptySeminarForm);
  const [activeTab, setActiveTab] = useState('basic');

  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ---- Related state ----
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [takeaways, setTakeaways] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);

  const { data: seminars, isLoading } = useQuery({
    queryKey: ['seminars', searchTerm, statusFilter],
    queryFn: async () => {
      let q = supabase.from('seminars').select('*').order('created_at', { ascending: false });
      if (searchTerm) q = q.ilike('title', `%${searchTerm}%`);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as 'draft' | 'published' | 'archived');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const loadRelated = async (id: string) => {
    const [sp, ag, tk, fq, ts, pe] = await Promise.all([
      supabase.from('seminar_speakers').select('*').eq('seminar_id', id).order('sort_order'),
      supabase.from('seminar_agenda').select('*').eq('seminar_id', id).order('sort_order'),
      supabase.from('seminar_key_takeaways').select('*').eq('seminar_id', id).order('sort_order'),
      supabase.from('seminar_faqs').select('*').eq('seminar_id', id).order('sort_order'),
      supabase.from('seminar_testimonials').select('*').eq('seminar_id', id).order('sort_order'),
      supabase.from('seminar_past_events').select('*').eq('seminar_id', id).order('sort_order'),
    ]);
    setSpeakers(sp.data || []);
    setAgenda(ag.data || []);
    setTakeaways(tk.data || []);
    setFaqs(fq.data || []);
    setTestimonials(ts.data || []);
    setPastEvents(pe.data || []);
  };

  const resetRelated = () => {
    setSpeakers([]); setAgenda([]); setTakeaways([]);
    setFaqs([]); setTestimonials([]); setPastEvents([]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form } as any;
      let seminarId = editingId;

      if (editingId) {
        const { error } = await supabase.from('seminars').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('seminars').insert([payload]).select('id').single();
        if (error) throw error;
        seminarId = data.id;
      }

      // Save related data
      await saveRelated(seminarId!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seminars'] });
      toast({ title: editingId ? 'Seminar updated' : 'Seminar created' });
      closeSheet();
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const saveRelated = async (id: string) => {
    // Speakers
    await supabase.from('seminar_speakers').delete().eq('seminar_id', id);
    if (speakers.length) await supabase.from('seminar_speakers').insert(speakers.map((s, i) => ({ ...s, seminar_id: id, sort_order: i, id: undefined })));

    // Agenda
    await supabase.from('seminar_agenda').delete().eq('seminar_id', id);
    if (agenda.length) await supabase.from('seminar_agenda').insert(agenda.map((a, i) => ({ ...a, seminar_id: id, sort_order: i, id: undefined })));

    // Key Takeaways
    await supabase.from('seminar_key_takeaways').delete().eq('seminar_id', id);
    if (takeaways.length) await supabase.from('seminar_key_takeaways').insert(takeaways.map((t, i) => ({ ...t, seminar_id: id, sort_order: i, id: undefined })));

    // FAQs
    await supabase.from('seminar_faqs').delete().eq('seminar_id', id);
    if (faqs.length) await supabase.from('seminar_faqs').insert(faqs.map((f, i) => ({ ...f, seminar_id: id, sort_order: i, id: undefined })));

    // Testimonials
    await supabase.from('seminar_testimonials').delete().eq('seminar_id', id);
    if (testimonials.length) await supabase.from('seminar_testimonials').insert(testimonials.map((t, i) => ({ ...t, seminar_id: id, sort_order: i, id: undefined })));

    // Past Events
    await supabase.from('seminar_past_events').delete().eq('seminar_id', id);
    if (pastEvents.length) await supabase.from('seminar_past_events').insert(pastEvents.map((p, i) => ({ ...p, seminar_id: id, sort_order: i, id: undefined })));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seminars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seminars'] }); toast({ title: 'Seminar deleted' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const openCreate = () => { setEditingId(null); setForm(emptySeminarForm); resetRelated(); setActiveTab('basic'); setIsSheetOpen(true); };

  const openEdit = async (seminar: any) => {
    setEditingId(seminar.id);
    setForm({
      title: seminar.title || '', subtitle: seminar.subtitle || '', slug: seminar.slug || '',
      type: seminar.type || 'technical', featured: seminar.featured || false,
      description: seminar.description || '', long_description: seminar.long_description || '',
      date: seminar.date || '', time: seminar.time || '', mode: seminar.mode || 'online',
      location: seminar.location || '', image_url: seminar.image_url || '',
      main_speaker: seminar.main_speaker || '', participants: seminar.participants || '',
      status: seminar.status || 'draft',
    });
    await loadRelated(seminar.id);
    setActiveTab('basic');
    setIsSheetOpen(true);
  };

  const closeSheet = () => { setIsSheetOpen(false); setEditingId(null); setForm(emptySeminarForm); resetRelated(); };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge variant="default">Published</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'archived': return <Badge variant="outline">Archived</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Generic list helpers
  const addItem = (list: any[], setter: (v: any[]) => void, item: any) => setter([...list, item]);
  const removeItem = (list: any[], setter: (v: any[]) => void, idx: number) => setter(list.filter((_, i) => i !== idx));
  const updateItem = (list: any[], setter: (v: any[]) => void, idx: number, field: string, value: any) => {
    const updated = [...list]; updated[idx] = { ...updated[idx], [field]: value }; setter(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seminars</h1>
          <p className="text-muted-foreground">Manage seminars and their details</p>
        </div>
        {canManage('programs') && (
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Seminar</Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search seminars..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
        <CardHeader><CardTitle>Seminar List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : seminars?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No seminars found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage('programs') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {seminars?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{s.mode}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{s.date || '-'}</TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    {canManage('programs') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          {canDelete('programs') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Seminar?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{s.title}" and all related data.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)}>Delete</AlertDialogAction>
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

      {/* Edit/Create Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Seminar' : 'Create Seminar'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="speakers">Speakers</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="more">More</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} placeholder="auto-generated-slug" /></div>
                </div>
                <div className="space-y-2"><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})} /></div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="non_technical">Non-Technical</SelectItem>
                        <SelectItem value="career">Career</SelectItem>
                        <SelectItem value="industry">Industry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select value={form.mode} onValueChange={(v) => setForm({...form, mode: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Date</Label><Input value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} placeholder="e.g., March 15, 2026" /></div>
                  <div className="space-y-2"><Label>Time</Label><Input value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} placeholder="e.g., 10:00 AM - 1:00 PM" /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Main Speaker</Label><Input value={form.main_speaker} onChange={(e) => setForm({...form, main_speaker: e.target.value})} /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Participants</Label><Input value={form.participants} onChange={(e) => setForm({...form, participants: e.target.value})} placeholder="e.g., 500+" /></div>
                  <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} /></div>
                <div className="space-y-2"><Label>Long Description</Label><Textarea value={form.long_description} onChange={(e) => setForm({...form, long_description: e.target.value})} rows={5} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.featured} onCheckedChange={(c) => setForm({...form, featured: c})} />
                  <Label>Featured</Label>
                </div>
              </TabsContent>

              <TabsContent value="speakers" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Speakers</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(speakers, setSpeakers, { name: '', role: '', bio: '', avatar_url: '' })}>
                    <Plus className="mr-1 h-3 w-3" />Add Speaker
                  </Button>
                </div>
                {speakers.map((s, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(speakers, setSpeakers, i)}><X className="h-4 w-4" /></Button></div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1"><Label>Name</Label><Input value={s.name} onChange={(e) => updateItem(speakers, setSpeakers, i, 'name', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Role</Label><Input value={s.role || ''} onChange={(e) => updateItem(speakers, setSpeakers, i, 'role', e.target.value)} /></div>
                      </div>
                      <div className="space-y-1"><Label>Bio</Label><Textarea value={s.bio || ''} onChange={(e) => updateItem(speakers, setSpeakers, i, 'bio', e.target.value)} rows={2} /></div>
                      <div className="space-y-1"><Label>Avatar URL</Label><Input value={s.avatar_url || ''} onChange={(e) => updateItem(speakers, setSpeakers, i, 'avatar_url', e.target.value)} /></div>
                    </CardContent>
                  </Card>
                ))}
                {speakers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No speakers added yet</p>}
              </TabsContent>

              <TabsContent value="agenda" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Agenda Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(agenda, setAgenda, { title: '', description: '', time: '', speaker: '' })}>
                    <Plus className="mr-1 h-3 w-3" />Add Item
                  </Button>
                </div>
                {agenda.map((a, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(agenda, setAgenda, i)}><X className="h-4 w-4" /></Button></div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1"><Label>Title</Label><Input value={a.title} onChange={(e) => updateItem(agenda, setAgenda, i, 'title', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Time</Label><Input value={a.time || ''} onChange={(e) => updateItem(agenda, setAgenda, i, 'time', e.target.value)} /></div>
                      </div>
                      <div className="space-y-1"><Label>Speaker</Label><Input value={a.speaker || ''} onChange={(e) => updateItem(agenda, setAgenda, i, 'speaker', e.target.value)} /></div>
                      <div className="space-y-1"><Label>Description</Label><Textarea value={a.description || ''} onChange={(e) => updateItem(agenda, setAgenda, i, 'description', e.target.value)} rows={2} /></div>
                    </CardContent>
                  </Card>
                ))}
                {agenda.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No agenda items yet</p>}
              </TabsContent>

              <TabsContent value="more" className="space-y-6 mt-4">
                {/* Key Takeaways */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Key Takeaways</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(takeaways, setTakeaways, { takeaway: '' })}>
                      <Plus className="mr-1 h-3 w-3" />Add
                    </Button>
                  </div>
                  {takeaways.map((t, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input value={t.takeaway} onChange={(e) => updateItem(takeaways, setTakeaways, i, 'takeaway', e.target.value)} placeholder="Key takeaway..." />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(takeaways, setTakeaways, i)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>

                {/* FAQs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">FAQs</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(faqs, setFaqs, { question: '', answer: '' })}>
                      <Plus className="mr-1 h-3 w-3" />Add FAQ
                    </Button>
                  </div>
                  {faqs.map((f, i) => (
                    <Card key={i} className="mb-2">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(faqs, setFaqs, i)}><X className="h-4 w-4" /></Button></div>
                        <div className="space-y-1"><Label>Question</Label><Input value={f.question} onChange={(e) => updateItem(faqs, setFaqs, i, 'question', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Answer</Label><Textarea value={f.answer} onChange={(e) => updateItem(faqs, setFaqs, i, 'answer', e.target.value)} rows={2} /></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Testimonials */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Testimonials</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(testimonials, setTestimonials, { name: '', role: '', content: '', rating: 5 })}>
                      <Plus className="mr-1 h-3 w-3" />Add
                    </Button>
                  </div>
                  {testimonials.map((t, i) => (
                    <Card key={i} className="mb-2">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(testimonials, setTestimonials, i)}><X className="h-4 w-4" /></Button></div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1"><Label>Name</Label><Input value={t.name} onChange={(e) => updateItem(testimonials, setTestimonials, i, 'name', e.target.value)} /></div>
                          <div className="space-y-1"><Label>Role</Label><Input value={t.role || ''} onChange={(e) => updateItem(testimonials, setTestimonials, i, 'role', e.target.value)} /></div>
                        </div>
                        <div className="space-y-1"><Label>Content</Label><Textarea value={t.content} onChange={(e) => updateItem(testimonials, setTestimonials, i, 'content', e.target.value)} rows={2} /></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Past Events */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Past Events</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(pastEvents, setPastEvents, { title: '', date: '', participants: '', image_url: '' })}>
                      <Plus className="mr-1 h-3 w-3" />Add
                    </Button>
                  </div>
                  {pastEvents.map((p, i) => (
                    <Card key={i} className="mb-2">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(pastEvents, setPastEvents, i)}><X className="h-4 w-4" /></Button></div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1"><Label>Title</Label><Input value={p.title} onChange={(e) => updateItem(pastEvents, setPastEvents, i, 'title', e.target.value)} /></div>
                          <div className="space-y-1"><Label>Date</Label><Input value={p.date || ''} onChange={(e) => updateItem(pastEvents, setPastEvents, i, 'date', e.target.value)} /></div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1"><Label>Participants</Label><Input value={p.participants || ''} onChange={(e) => updateItem(pastEvents, setPastEvents, i, 'participants', e.target.value)} /></div>
                          <div className="space-y-1"><Label>Image URL</Label><Input value={p.image_url || ''} onChange={(e) => updateItem(pastEvents, setPastEvents, i, 'image_url', e.target.value)} /></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeSheet}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update Seminar' : 'Create Seminar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
