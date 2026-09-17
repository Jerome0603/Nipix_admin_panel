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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2, X } from 'lucide-react';

interface WorkshopForm {
  title: string;
  subtitle: string;
  slug: string;
  type: string;
  featured: boolean;
  description: string;
  date: string;
  duration: string;
  mode: string;
  location: string;
  image_url: string;
  main_trainer: string;
  participants: string;
  status: string;
}

const emptyForm: WorkshopForm = {
  title: '', subtitle: '', slug: '', type: 'technical', featured: false,
  description: '', date: '', duration: '', mode: '', location: '',
  image_url: '', main_trainer: '', participants: '', status: 'draft',
};

export default function Workshops() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkshopForm>(emptyForm);
  const [activeTab, setActiveTab] = useState('basic');

  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [trainers, setTrainers] = useState<any[]>([]);
  const [agendaDays, setAgendaDays] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);

  const { data: workshops, isLoading } = useQuery({
    queryKey: ['workshops', searchTerm, statusFilter],
    queryFn: async () => {
      let q = supabase.from('workshops').select('*').order('created_at', { ascending: false });
      if (searchTerm) q = q.ilike('title', `%${searchTerm}%`);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as 'draft' | 'published' | 'archived');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const loadRelated = async (id: string) => {
    const [tr, ad, fq, oc, ts, pe] = await Promise.all([
      supabase.from('workshop_trainers').select('*').eq('workshop_id', id),
      supabase.from('workshop_agenda_days').select('*, workshop_agenda_sessions(*)').eq('workshop_id', id),
      supabase.from('workshop_faqs').select('*').eq('workshop_id', id),
      supabase.from('workshop_learning_outcomes').select('*').eq('workshop_id', id),
      supabase.from('workshop_testimonials').select('*').eq('workshop_id', id),
      supabase.from('workshop_past_events').select('*').eq('workshop_id', id),
    ]);
    console.log("Loading related for:", id);
    setTrainers(
      (tr.data || []).map(t => ({
        name: t.name,
        designation: t.designation,
        bio: t.bio,
        image_url: t.image_url,
      }))
    );
    setAgendaDays((ad.data || []).map((d: any) => ({
      ...d,
      sessions: d.workshop_agenda_sessions?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)) || [],
    })));
    setFaqs(fq.data || []);
    setOutcomes(oc.data || []);
    setTestimonials(ts.data || []);
    setPastEvents(pe.data || []);
  };

  const resetRelated = () => {
    setTrainers([]); setAgendaDays([]); setFaqs([]);
    setOutcomes([]); setTestimonials([]); setPastEvents([]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form } as any;
      let workshopId = editingId;

      if (editingId) {
        const { error } = await supabase.from('workshops').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('workshops').insert([payload]).select('id').single();
        if (error) throw error;
        workshopId = data.id;
      }
      await saveRelated(workshopId!);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workshops'] }); toast({ title: editingId ? 'Workshop updated' : 'Workshop created' }); closeSheet(); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const saveRelated = async (id: string) => {
    // Trainers
    await supabase.from('workshop_trainers').delete().eq('workshop_id', id);
    if (trainers.length) await supabase.from('workshop_trainers').insert(trainers.map((t, i) => ({ name: t.name, role: t.role, bio: t.bio, avatar_url: t.avatar_url, workshop_id: id, sort_order: i })));

    // Agenda Days + Sessions
    await supabase.from('workshop_agenda_days').delete().eq('workshop_id', id);
    for (let i = 0; i < agendaDays.length; i++) {
      const day = agendaDays[i];
      const { data: dayData } = await supabase.from('workshop_agenda_days').insert({ workshop_id: id, day_number: day.day_number || i + 1, day_title: day.day_title, day_date: day.day_date, sort_order: i }).select('id').single();
      if (dayData && day.sessions?.length) {
        await supabase.from('workshop_agenda_sessions').insert(
          day.sessions.map((s: any, j: number) => ({ agenda_day_id: dayData.id, title: s.title, description: s.description, start_time: s.start_time, end_time: s.end_time, speaker: s.speaker, sort_order: j }))
        );
      }
    }

    // FAQs
    await supabase.from('workshop_faqs').delete().eq('workshop_id', id);
    if (faqs.length) await supabase.from('workshop_faqs').insert(faqs.map((f, i) => ({ question: f.question, answer: f.answer, workshop_id: id, sort_order: i })));

    // Learning Outcomes
    await supabase.from('workshop_learning_outcomes').delete().eq('workshop_id', id);
    if (outcomes.length) await supabase.from('workshop_learning_outcomes').insert(outcomes.map((o, i) => ({ outcome: o.outcome, workshop_id: id, sort_order: i })));

    // Testimonials
    await supabase.from('workshop_testimonials').delete().eq('workshop_id', id);
    if (testimonials.length) await supabase.from('workshop_testimonials').insert(testimonials.map((t, i) => ({ name: t.name, role: t.role, content: t.content, avatar_url: t.avatar_url, rating: t.rating, workshop_id: id, sort_order: i })));

    // Past Events
    await supabase.from('workshop_past_events').delete().eq('workshop_id', id);
    if (pastEvents.length) await supabase.from('workshop_past_events').insert(pastEvents.map((p, i) => ({ title: p.title, date: p.date, participants: p.participants, image_url: p.image_url, workshop_id: id, sort_order: i })));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('workshops').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workshops'] }); toast({ title: 'Workshop deleted' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); resetRelated(); setActiveTab('basic'); setIsSheetOpen(true); };

  const openEdit = async (w: any) => {
    setEditingId(w.id);
    setForm({
      title: w.title || '', subtitle: w.subtitle || '', slug: w.slug || '',
      type: w.type || 'technical', featured: w.featured || false,
      description: w.description || '', date: w.date || '', duration: w.duration || '',
      mode: w.mode || '', location: w.location || '', image_url: w.image_url || '',
      main_trainer: w.main_trainer || '', participants: w.participants || '', status: w.status || 'draft',
    });
    console.log("Workshop ID:", w.id);
    await loadRelated(w.id);
    setActiveTab('basic');
    setIsSheetOpen(true);
  };

  const closeSheet = () => { setIsSheetOpen(false); setEditingId(null); setForm(emptyForm); resetRelated(); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge variant="default">Published</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'archived': return <Badge variant="outline">Archived</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const addItem = (list: any[], setter: (v: any[]) => void, item: any) => setter([...list, item]);
  const removeItem = (list: any[], setter: (v: any[]) => void, idx: number) => setter(list.filter((_, i) => i !== idx));
  const updateItem = (list: any[], setter: (v: any[]) => void, idx: number, field: string, value: any) => {
    const updated = [...list]; updated[idx] = { ...updated[idx], [field]: value }; setter(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workshops</h1>
          <p className="text-muted-foreground">Manage workshops and their details</p>
        </div>
        {canManage('programs') && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Workshop</Button>}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search workshops..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
        <CardHeader><CardTitle>Workshop List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : workshops?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No workshops found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage('programs') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {workshops?.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.title}</TableCell>
                    <TableCell><Badge variant="outline">{w.type}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{w.mode}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{w.duration || '-'}</TableCell>
                    <TableCell>{getStatusBadge(w.status)}</TableCell>
                    {canManage('programs') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="h-4 w-4" /></Button>
                          {canDelete('programs') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Workshop?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{w.title}" and all related data.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(w.id)}>Delete</AlertDialogAction>
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
          <SheetHeader><SheetTitle>{editingId ? 'Edit Workshop' : 'Create Workshop'}</SheetTitle>
            <SheetDescription>
              Manage workshop details and related information.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="trainers">Trainers</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="more">More</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})} /></div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select value={form.mode} onValueChange={(v) => setForm({...form, mode: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
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
                  <div className="space-y-2"><Label>Date</Label><Input value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} placeholder="e.g., 2 days" /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Main Trainer</Label><Input value={form.main_trainer} onChange={(e) => setForm({...form, main_trainer: e.target.value})} /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Participants</Label><Input value={form.participants} onChange={(e) => setForm({...form, participants: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={4} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.featured} onCheckedChange={(c) => setForm({...form, featured: c})} />
                  <Label>Featured</Label>
                </div>
              </TabsContent>

              <TabsContent value="trainers" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Trainers</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(trainers, setTrainers, { name: '', designation: '', bio: '', image_url: '' })}>
                    <Plus className="mr-1 h-3 w-3" />Add Trainer 
                  </Button>
                </div>
                {trainers.map((t, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(trainers, setTrainers, i)}><X className="h-4 w-4" /></Button></div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1"><Label>Name</Label><Input value={t.name} onChange={(e) => updateItem(trainers, setTrainers, i, 'name', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Designation</Label><Input value={t.designation || ''} onChange={(e) => updateItem(trainers, setTrainers, i, 'designation', e.target.value)} /></div>
                      </div>
                      <div className="space-y-1"><Label>Bio</Label><Textarea value={t.bio || ''} onChange={(e) => updateItem(trainers, setTrainers, i, 'bio', e.target.value)} rows={2} /></div>
                      <div className="space-y-1"><Label>Image URL</Label><Input value={t.image_url || ''} onChange={(e) => updateItem(trainers, setTrainers, i, 'image_url', e.target.value)} /></div>
                    </CardContent>
                  </Card>
                ))}
                {trainers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No trainers added yet</p>}
              </TabsContent>

              <TabsContent value="agenda" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Agenda Days</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(agendaDays, setAgendaDays, { day_number: agendaDays.length + 1, title: '', day_date: '', sessions: [] })}>
                    <Plus className="mr-1 h-3 w-3" />Add Day
                  </Button>
                </div>
                {agendaDays.map((day, di) => (
                  <Card key={di}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Day {day.day_number}</h4>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(agendaDays, setAgendaDays, di)}><X className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1"><Label>Title</Label><Input value={day.title || ''} onChange={(e) => updateItem(agendaDays, setAgendaDays, di, 'day_title', e.target.value)} /></div>
                        <div className="space-y-1"><Label>Date</Label><Input value={day.day || ''} onChange={(e) => updateItem(agendaDays, setAgendaDays, di, 'day_date', e.target.value)} /></div>
                      </div>
                      <div className="ml-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Sessions</span>
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            const updated = [...agendaDays];
                            updated[di] = { ...updated[di], sessions: [...(updated[di].sessions || []), { topic: '', description: '', time: ''}] };
                            setAgendaDays(updated);
                          }}><Plus className="mr-1 h-3 w-3" />Add Session</Button>
                        </div>
                        {(day.sessions || []).map((s: any, si: number) => (
                          <Card key={si} className="bg-muted/30">
                            <CardContent className="pt-3 space-y-2">
                              <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => {
                                const updated = [...agendaDays];
                                updated[di] = { ...updated[di], sessions: updated[di].sessions.filter((_: any, i: number) => i !== si) };
                                setAgendaDays(updated);
                              }}><X className="h-3 w-3" /></Button></div>
                              <div className="space-y-1"><Label>Title</Label><Input value={s.topic} onChange={(e) => {
                                const updated = [...agendaDays]; updated[di].sessions[si] = { ...updated[di].sessions[si], title: e.target.value }; setAgendaDays(updated);
                              }} /></div>
                              <div className="grid gap-2 md:grid-cols-3">
                                <div className="space-y-1"><Label>Time</Label><Input value={s.time || ''} onChange={(e) => {
                                  const updated = [...agendaDays]; updated[di].sessions[si] = { ...updated[di].sessions[si], time: e.target.value }; setAgendaDays(updated);
                                }} /></div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {agendaDays.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No agenda days yet</p>}
              </TabsContent>

              <TabsContent value="more" className="space-y-6 mt-4">
                {/* Learning Outcomes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Learning Outcomes</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(outcomes, setOutcomes, { outcome: '' })}><Plus className="mr-1 h-3 w-3" />Add</Button>
                  </div>
                  {outcomes.map((o, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input value={o.content} onChange={(e) => updateItem(outcomes, setOutcomes, i, 'content', e.target.value)} placeholder="Learning outcome..." />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(outcomes, setOutcomes, i)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>

                {/* FAQs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">FAQs</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(faqs, setFaqs, { question: '', answer: '' })}><Plus className="mr-1 h-3 w-3" />Add FAQ</Button>
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
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(testimonials, setTestimonials, { name: '', role: '', content: '', rating: 5 })}><Plus className="mr-1 h-3 w-3" />Add</Button>
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
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem(pastEvents, setPastEvents, { title: '', date: '', participants: '', image_url: '' })}><Plus className="mr-1 h-3 w-3" />Add</Button>
                  </div>
                  {pastEvents.map((p, i) => (
                    <Card key={i} className="mb-2">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(pastEvents, setPastEvents, i)}><X className="h-4 w-4" /></Button></div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1"><Label>Title</Label><Input value={p.title} onChange={(e) => updateItem(pastEvents, setPastEvents, i, 'title', e.target.value)} /></div>
                          <div className="space-y-1"><Label>Date</Label><Input value={p.date || ''} onChange={(e) => updateItem(pastEvents, setPastEvents, i, 'date', e.target.value)} /></div>
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
                {editingId ? 'Update Workshop' : 'Create Workshop'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
