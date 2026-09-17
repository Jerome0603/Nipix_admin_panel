import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';

type InternshipType = 'online' | 'hybrid' | 'offline';
type CourseStatus = 'draft' | 'published' | 'archived';

interface InternshipFormData {
  title: string;
  subtitle: string;
  company: string;
  type: InternshipType;
  duration: string;
  openings: number;
  stipend: string;
  description: string;
  image_url: string;
  start_date: string;
  certificate_enabled: boolean;
  status: CourseStatus;
  deadline: string;
}

const defaultForm: InternshipFormData = {
  title: '', subtitle: '', company: '', type: 'online', duration: '', openings: 0,
  stipend: '', description: '', image_url: '',
  start_date: '',  certificate_enabled: false,
  status: 'draft', deadline: '',
  };

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function Internships() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<InternshipFormData>(defaultForm);

  // Related data state
  const [newSkill, setNewSkill] = useState('');
  const [newResponsibility, setNewResponsibility] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-generate slug from title
  useEffect(() => {
    if (!editingId && formData.title) {
      setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [formData.title, editingId]);

  const { data: internships, isLoading } = useQuery({
    queryKey: ['internships', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase.from('internships').select('*').order('created_at', { ascending: false });
      if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter as CourseStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: skills } = useQuery({
    queryKey: ['internship-skills', editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data, error } = await supabase.from('internship_skills').select('*').eq('internship_id', editingId);
      if (error) throw error;
      return data;
    },
    enabled: !!editingId,
  });

  const { data: responsibilities } = useQuery({
    queryKey: ['internship-responsibilities', editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data, error } = await supabase.from('internship_responsibilities').select('*').eq('internship_id', editingId).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!editingId,
  });

  const { data: benefits } = useQuery({
    queryKey: ['internship-benefits', editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data, error } = await supabase.from('internship_benefits').select('*').eq('internship_id', editingId).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!editingId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...formData, deadline: formData.deadline || null,start_date: formData.start_date || null, subtitle: formData.subtitle || null };
      // Remove fields that aren't in table for create
      if (editingId) {
        const { error } = await supabase.from('internships').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('internships').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      toast({ title: editingId ? 'Internship updated' : 'Internship created' });
      handleClose();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error saving internship', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('internships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      toast({ title: 'Internship deleted' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Related data mutations
  const addSkillMutation = useMutation({
    mutationFn: async (skill: string) => {
      const { error } = await supabase.from('internship_skills').insert([{ internship_id: editingId!, skill }]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internship-skills'] }); },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('internship_skills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internship-skills'] }); },
  });

  const addResponsibilityMutation = useMutation({
    mutationFn: async (responsibility: string) => {
      const nextOrder = (responsibilities?.length ?? 0) + 1;
      const { error } = await supabase.from('internship_responsibilities').insert([{ internship_id: editingId!, responsibility, sort_order: nextOrder }]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internship-responsibilities'] }); },
  });

  const deleteResponsibilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('internship_responsibilities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internship-responsibilities'] }); },
  });

  const addBenefitMutation = useMutation({
    mutationFn: async (benefit: string) => {
      const nextOrder = (benefits?.length ?? 0) + 1;
      const { error } = await supabase.from('internship_benefits').insert([{ internship_id: editingId!, benefit, sort_order: nextOrder }]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internship-benefits'] }); },
  });

  const deleteBenefitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('internship_benefits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internship-benefits'] }); },
  });

  const handleClose = () => {
    setIsSheetOpen(false);
    setEditingId(null);
    setActiveTab('basic');
    setFormData(defaultForm);
    setNewSkill('');
    setNewResponsibility('');
    setNewBenefit('');
  };

  const handleEdit = (internship: any) => {
    setEditingId(internship.id);
    setFormData({
      title: internship.title ?? '',
      subtitle: internship.subtitle ?? '',
      company: internship.company ?? '',
      type: internship.type ?? 'online',
      duration: internship.duration ?? '',
      openings: internship.openings ?? 0,
      stipend: internship.stipend ?? '',
      description: internship.description ?? '',
      image_url: internship.image_url ?? '',
      start_date: internship.start_date ?? '',
      certificate_enabled: internship.certificate_enabled ?? false,
      status: internship.status ?? 'draft',
      deadline: internship.application_deadline ?? '',
    });
    setActiveTab('basic');
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setActiveTab('basic');
    setIsSheetOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const updateField = (field: keyof InternshipFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case 'published': return <Badge variant="default">Published</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'archived': return <Badge variant="outline">Archived</Badge>;
    }
  };

  const getTypeBadge = (type: InternshipType) => {
    switch (type) {
      case 'online': return <Badge variant="outline" className="border-primary/30 text-primary">Online</Badge>;
      case 'hybrid': return <Badge variant="outline" className="border-primary/50 text-primary">Hybrid</Badge>;
      case 'offline': return <Badge variant="outline" className="border-primary text-primary">Offline</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internships</h1>
          <p className="text-muted-foreground">Manage internship opportunities</p>
        </div>
        {canManage('internships') && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Internship
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search internships..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Internship List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : internships?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No internships found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Openings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage('internships') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {internships?.map((internship) => (
                  <TableRow key={internship.id}>
                    <TableCell className="font-medium">{internship.title}</TableCell>
                    <TableCell>{internship.company}</TableCell>
                    <TableCell>{getTypeBadge(internship.type as InternshipType)}</TableCell>
                    <TableCell>{internship.openings}</TableCell>
                    <TableCell>{getStatusBadge(internship.status as CourseStatus)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(internship.created_at), 'MMM d, yyyy')}</TableCell>
                    {canManage('internships') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(internship)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete('internships') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Internship?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete "{internship.title}" and all related data.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(internship.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
      <Sheet open={isSheetOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Internship' : 'New Internship'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="requirements" disabled={!editingId}>Requirements</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* ═══ BASIC INFO TAB ═══ */}
              <TabsContent value="basic" className="space-y-6 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Internship Title <span className="text-destructive">*</span></Label>
                    <Input value={formData.title} onChange={(e) => updateField('title', e.target.value)} required placeholder="e.g. Frontend Developer Intern" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sub-Title <span className="text-destructive">*</span></Label>
                    <Input value={formData.subtitle} onChange={(e) => updateField('subtitle', e.target.value)} required placeholder="Short description of the internship" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name <span className="text-destructive">*</span></Label>
                    <Input value={formData.company} onChange={(e) => updateField('company', e.target.value)} required placeholder="e.g. Acme Corp" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Internship Type</Label>
                    <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.type === 'offline' || formData.type === 'hybrid') && (
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={formData.stipend} onChange={(e) => updateField('stipend', e.target.value)} placeholder="e.g. Mumbai, India" />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input value={formData.duration} onChange={(e) => updateField('duration', e.target.value)} placeholder="e.g. 3 months" />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input value={formData.start_date} onChange={(e) => updateField('start_date', e.target.value)} placeholder="e.g. 2026-03-01" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Number of Openings</Label>
                    <Input type="number" min="0" value={formData.openings} onChange={(e) => updateField('openings', parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Detailed Description</Label>
                  <Textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} rows={5} placeholder="Full internship description..." />
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Thumbnail Image URL</Label>
                    <Input value={formData.image_url} onChange={(e) => updateField('image_url', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </TabsContent>

              {/* ═══ COMPENSATION TAB ═══ 
              <TabsContent value="compensation" className="space-y-6 mt-6">
                <Separator />

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <Label className="text-base">Certificate Provided</Label>
                    <p className="text-sm text-muted-foreground">Issue a certificate on completion</p>
                  </div>
                  <Switch checked={formData.certificate_enabled} onCheckedChange={(v) => updateField('certificate_enabled', v)} />
                </div>

                {/* Benefits section - only for editing 
                {editingId && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-base">Additional Benefits</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Add a benefit..." value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)} onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); if (newBenefit.trim()) { addBenefitMutation.mutate(newBenefit.trim()); setNewBenefit(''); } }
                        }} />
                        <Button type="button" size="sm" variant="outline" onClick={() => { if (newBenefit.trim()) { addBenefitMutation.mutate(newBenefit.trim()); setNewBenefit(''); } }}>Add</Button>
                      </div>
                      <div className="space-y-2">
                        {benefits?.map((b) => (
                          <div key={b.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                            <span className="text-sm">{b.benefit}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBenefitMutation.mutate(b.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {(!benefits || benefits.length === 0) && <p className="text-sm text-muted-foreground">No benefits added yet.</p>}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>*/}

              {/* ═══ REQUIREMENTS TAB ═══ */}
              <TabsContent value="requirements" className="space-y-6 mt-6">
                <Separator />

                {/* Skills */}
                <div className="space-y-3">
                  <Label className="text-base">Required Skills</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Add skill (press Enter)..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); if (newSkill.trim()) { addSkillMutation.mutate(newSkill.trim()); setNewSkill(''); } }
                    }} />
                    <Button type="button" size="sm" variant="outline" onClick={() => { if (newSkill.trim()) { addSkillMutation.mutate(newSkill.trim()); setNewSkill(''); } }}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skills?.map((s) => (
                      <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                        {s.skill}
                        <button type="button" onClick={() => deleteSkillMutation.mutate(s.id)} className="ml-1 rounded-full hover:bg-muted p-0.5"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                    {(!skills || skills.length === 0) && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
                  </div>
                </div>

                <Separator />

                {/* Responsibilities */}
                <div className="space-y-3">
                  <Label className="text-base">Responsibilities</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Add responsibility..." value={newResponsibility} onChange={(e) => setNewResponsibility(e.target.value)} onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); if (newResponsibility.trim()) { addResponsibilityMutation.mutate(newResponsibility.trim()); setNewResponsibility(''); } }
                    }} />
                    <Button type="button" size="sm" variant="outline" onClick={() => { if (newResponsibility.trim()) { addResponsibilityMutation.mutate(newResponsibility.trim()); setNewResponsibility(''); } }}>Add</Button>
                  </div>
                  <div className="space-y-2">
                    {responsibilities?.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <span className="text-sm">{r.responsibility}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteResponsibilityMutation.mutate(r.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {(!responsibilities || responsibilities.length === 0) && <p className="text-sm text-muted-foreground">No responsibilities added yet.</p>}
                  </div>
                </div>
              </TabsContent>

              {/* ═══ APPLICATION TAB ═══ 
              <TabsContent value="application" className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label>Application Deadline</Label>
                  <Input value={formData.application_deadline} onChange={(e) => updateField('application_deadline', e.target.value)} placeholder="e.g. 2026-03-15" />
                </div>

                <div className="space-y-2">
                  <Label>Application Mode</Label>
                  <Select value={formData.application_mode} onValueChange={(v) => updateField('application_mode', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Form</SelectItem>
                      <SelectItem value="external">External Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.application_mode === 'external' && (
                  <div className="space-y-2">
                    <Label>External Application URL</Label>
                    <Input value={formData.external_url} onChange={(e) => updateField('external_url', e.target.value)} placeholder="https://..." />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <Label className="text-base">Allow Applications</Label>
                    <p className="text-sm text-muted-foreground">Accept new applications</p>
                  </div>
                  <Switch checked={formData.allow_applications} onCheckedChange={(v) => updateField('allow_applications', v)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <Label className="text-base">Auto Close After Deadline</Label>
                    <p className="text-sm text-muted-foreground">Automatically stop accepting applications</p>
                  </div>
                  <Switch checked={formData.auto_close_after_deadline} onCheckedChange={(v) => updateField('auto_close_after_deadline', v)} />
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input type="email" value={formData.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} placeholder="hr@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input value={formData.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} placeholder="+91..." />
                  </div>
                </div>
              </TabsContent>*/}

              {/* ═══ SETTINGS TAB ═══ */}
              <TabsContent value="settings" className="space-y-6 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="mt-8 flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update Internship' : 'Create Internship'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
