import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2, X, GripVertical } from 'lucide-react';
import { format } from 'date-fns';

type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
type CourseStatus = 'draft' | 'published' | 'archived';
type EventMode = 'online' | 'offline' | 'hybrid';

interface CourseFormData {
  title: string;
  slug: string;
  subtitle: string;
  short_description: string;
  description: string;
  duration: string;
  level: CourseLevel;
  mode: EventMode;
  language: string;
  price: number;
  original_price: number;
  start_date: string;
  status: CourseStatus;
  certificate_enabled: boolean;
  thumbnail_url: string;
  syllabus_url: string;
}

const emptyForm: CourseFormData = {
  title: '',
  slug: '',
  subtitle: '',
  short_description: '',
  description: '',
  duration: '',
  level: 'beginner',
  mode: 'online',
  language: 'English',
  price: 0,
  original_price: 0,
  start_date: '',
  status: 'draft',
  certificate_enabled: false,
  thumbnail_url: '',
  syllabus_url: '',
};

// ── Dynamic list item types ──
interface ModuleItem {
  id?: string;
  title: string;
  description: string;
  sort_order: number;
  lessons: LessonItem[];
}

interface LessonItem {
  id?: string;
  title: string;
  description: string;
  duration: string;
  video_url: string;
  sort_order: number;
}

interface OutcomeItem { id?: string; outcome: string; type: string; sort_order: number; }
interface ProjectItem { id?: string; title: string; description: string; sort_order: number; }
interface FaqItem { id?: string; question: string; answer: string; sort_order: number; }

export default function Courses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({ ...emptyForm });
  const [tagInput, setTagInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Dynamic content state
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Queries ──
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('id, title, level, price, status, certificate_enabled, created_at, slug, thumbnail_url')
        .order('created_at', { ascending: false });
      if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter as CourseStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: instructors } = useQuery({
    queryKey: ['instructors-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instructors').select('id, name').eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });

  const { data: certificateTemplates } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('certificate_templates').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: courseInstructors } = useQuery({
    queryKey: ['course-instructors', editingCourseId],
    queryFn: async () => {
      if (!editingCourseId) return [];
      const { data, error } = await supabase.from('course_instructors').select('instructor_id').eq('course_id', editingCourseId);
      if (error) throw error;
      return data.map(ci => ci.instructor_id);
    },
    enabled: !!editingCourseId,
  });

  const { data: enrollmentCount } = useQuery({
    queryKey: ['enrollment-count', editingCourseId],
    queryFn: async () => {
      if (!editingCourseId) return 0;
      const { count, error } = await supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', editingCourseId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!editingCourseId,
  });

  const { data: revenue } = useQuery({
    queryKey: ['course-revenue', editingCourseId],
    queryFn: async () => {
      if (!editingCourseId) return 0;
      const { data, error } = await supabase.from('payments').select('amount').eq('course_id', editingCourseId).eq('status', 'paid');
      if (error) throw error;
      return data.reduce((sum, p) => sum + Number(p.amount), 0);
    },
    enabled: !!editingCourseId,
  });

  // ── Load course content for editing ──
  const loadCourseContent = useCallback(async (courseId: string) => {
    const [modRes, outRes, projRes, faqRes] = await Promise.all([
      supabase.from('course_modules').select('*, course_lessons(*)').eq('course_id', courseId).order('sort_order'),
      supabase.from('course_learning_outcomes').select('*').eq('course_id', courseId).order('sort_order'),
      supabase.from('course_projects').select('*').eq('course_id', courseId).order('sort_order'),
      supabase.from('course_faqs').select('*').eq('course_id', courseId).order('sort_order'),
    ]);

    setModules((modRes.data || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description || '',
      sort_order: m.sort_order || 0,
      lessons: (m.course_lessons || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((l: any) => ({
        id: l.id,
        title: l.title,
        description: l.description || '',
        duration: l.duration || '',
        video_url: l.video_url || '',
        sort_order: l.sort_order || 0,
      })),
    })));
    setOutcomes((outRes.data || []).map(o => ({ id: o.id, outcome: o.outcome, type: o.type || '', sort_order: o.sort_order || 0 })));
    setProjects((projRes.data || []).map(p => ({ id: p.id, title: p.title, description: p.description || '', sort_order: p.sort_order || 0 })));
    setFaqs((faqRes.data || []).map(f => ({ id: f.id, question: f.question, answer: f.answer, sort_order: f.sort_order || 0 })));
  }, []);

  // ── Open editor ──
  const openEditor = useCallback(async (course?: any) => {
    if (course) {
      // Fetch full course data
      const { data } = await supabase.from('courses').select('*').eq('id', course.id).single();
      if (data) {
        setFormData({
          title: data.title,
          slug: data.slug || '',
          subtitle: data.subtitle || '',
          short_description: data.short_description || '',
          description: data.description || '',
          duration: data.duration || '',
          level: data.level,
          mode: data.mode || 'online',
          language: data.language || 'English',
          price: Number(data.price),
          original_price: Number(data.original_price) || 0,
          start_date: data.start_date || '',
          status: data.status,
          certificate_enabled: data.certificate_enabled,
          thumbnail_url: data.thumbnail_url || '',
          syllabus_url: data.syllabus_url || '',
        });
        setEditingCourseId(data.id);
        await loadCourseContent(data.id);
      }
    } else {
      setFormData({ ...emptyForm });
      setEditingCourseId(null);
      setModules([]);
      setOutcomes([]);
      setProjects([]);
      setFaqs([]);
      setSelectedTemplateId('');
    }
    setEditorOpen(true);
  }, [loadCourseContent]);

  // ── Save course ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formData.title,
        slug: formData.slug || null,
        subtitle: formData.subtitle || null,
        short_description: formData.short_description || null,
        description: formData.description || null,
        duration: formData.duration || null,
        level: formData.level,
        mode: formData.mode,
        language: formData.language || 'English',
        price: formData.price,
        original_price: formData.original_price,
        start_date: formData.start_date || null,
        status: formData.status,
        certificate_enabled: formData.certificate_enabled,
        thumbnail_url: formData.thumbnail_url || null,
        syllabus_url: formData.syllabus_url || null,
      };

      let courseId = editingCourseId;

      if (editingCourseId) {
        const { error } = await supabase.from('courses').update(payload).eq('id', editingCourseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('courses').insert([payload]).select('id').single();
        if (error) throw error;
        courseId = data.id;
      }

      if (!courseId) throw new Error('Course ID missing');

      // Save modules & lessons
      // Delete existing, then re-insert
      await supabase.from('course_modules').delete().eq('course_id', courseId);
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        const { data: modData, error: modErr } = await supabase.from('course_modules').insert({
          course_id: courseId,
          title: mod.title,
          description: mod.description || null,
          sort_order: i,
        }).select('id').single();
        if (modErr) throw modErr;

        if (mod.lessons.length > 0) {
          const lessonsPayload = mod.lessons.map((l, j) => ({
            module_id: modData.id,
            title: l.title,
            description: l.description || null,
            duration: l.duration || null,
            video_url: l.video_url || null,
            sort_order: j,
          }));
          const { error: lesErr } = await supabase.from('course_lessons').insert(lessonsPayload);
          if (lesErr) throw lesErr;
        }
      }

      // Save outcomes
      await supabase.from('course_learning_outcomes').delete().eq('course_id', courseId);
      if (outcomes.length > 0) {
        const { error } = await supabase.from('course_learning_outcomes').insert(
          outcomes.map((o, i) => ({ course_id: courseId!, outcome: o.outcome, type: o.type, sort_order: i }))
        );
        if (error) throw error;
      }

      // Save projects
      await supabase.from('course_projects').delete().eq('course_id', courseId);
      if (projects.length > 0) {
        const { error } = await supabase.from('course_projects').insert(
          projects.map((p, i) => ({ course_id: courseId!, title: p.title, description: p.description || null, sort_order: i }))
        );
        if (error) throw error;
      }

      // Save FAQs
      await supabase.from('course_faqs').delete().eq('course_id', courseId);
      if (faqs.length > 0) {
        const { error } = await supabase.from('course_faqs').insert(
          faqs.map((f, i) => ({ course_id: courseId!, question: f.question, answer: f.answer, sort_order: i }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: editingCourseId ? 'Course updated successfully' : 'Course created successfully' });
      setEditorOpen(false);
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error saving course', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: 'Course deleted successfully' });
      setDeleteId(null);
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error deleting course', description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    saveMutation.mutate();
  };

  // ── Tag helpers ──
  {/*const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };*/}

  // ── Module/Lesson helpers ──
  const addModule = () => setModules([...modules, { title: '', description: '', sort_order: modules.length, lessons: [] }]);
  const removeModule = (idx: number) => setModules(modules.filter((_, i) => i !== idx));
  const updateModule = (idx: number, field: string, value: string) => {
    const updated = [...modules];
    (updated[idx] as any)[field] = value;
    setModules(updated);
  };
  const addLesson = (modIdx: number) => {
    const updated = [...modules];
    updated[modIdx].lessons.push({ title: '', description: '', duration: '', video_url: '', sort_order: updated[modIdx].lessons.length });
    setModules(updated);
  };
  const removeLesson = (modIdx: number, lesIdx: number) => {
    const updated = [...modules];
    updated[modIdx].lessons = updated[modIdx].lessons.filter((_, i) => i !== lesIdx);
    setModules(updated);
  };
  const updateLesson = (modIdx: number, lesIdx: number, field: string, value: string) => {
    const updated = [...modules];
    (updated[modIdx].lessons[lesIdx] as any)[field] = value;
    setModules(updated);
  };

  // ── Outcome helpers ──
  const addOutcome = () => setOutcomes([...outcomes, { outcome: '', type: '', sort_order: outcomes.length }]);
  const removeOutcome = (idx: number) => setOutcomes(outcomes.filter((_, i) => i !== idx));
  const updateOutcome = (idx: number, field: string, value: string) => {
    const updated = [...outcomes];
    (updated[idx] as any)[field] = value;
    setOutcomes(updated);
  };

  // ── Project helpers ──
  const addProject = () => setProjects([...projects, { title: '', description: '', sort_order: projects.length }]);
  const removeProject = (idx: number) => setProjects(projects.filter((_, i) => i !== idx));
  const updateProject = (idx: number, field: string, value: string) => {
    const updated = [...projects];
    (updated[idx] as any)[field] = value;
    setProjects(updated);
  };

  // ── FAQ helpers ──
  const addFaq = () => setFaqs([...faqs, { question: '', answer: '', sort_order: faqs.length }]);
  const removeFaq = (idx: number) => setFaqs(faqs.filter((_, i) => i !== idx));
  const updateFaq = (idx: number, field: string, value: string) => {
    const updated = [...faqs];
    (updated[idx] as any)[field] = value;
    setFaqs(updated);
  };

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case 'published': return <Badge variant="default">Published</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'archived': return <Badge variant="outline">Archived</Badge>;
    }
  };

  const getLevelBadge = (level: CourseLevel) => {
    switch (level) {
      case 'beginner': return <Badge variant="outline">Beginner</Badge>;
      case 'intermediate': return <Badge variant="outline">Intermediate</Badge>;
      case 'advanced': return <Badge variant="outline">Advanced</Badge>;
    }
  };

  const setField = (field: keyof CourseFormData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">Manage your course catalog</p>
        </div>
        {canManage('courses') && (
          <Button onClick={() => openEditor()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search courses..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

      {/* Courses Table */}
      <Card>
        <CardHeader><CardTitle>Course List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : courses?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No courses found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage('courses') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses?.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt="" className="h-10 w-14 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded bg-muted text-xs text-muted-foreground">No img</div>
                        )}
                        <span>{course.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getLevelBadge(course.level)}</TableCell>
                    <TableCell>₹{Number(course.price).toFixed(0)}</TableCell>
                    <TableCell>{getStatusBadge(course.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(course.created_at), 'MMM d, yyyy')}</TableCell>
                    {canManage('courses') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditor(course)}><Pencil className="h-4 w-4" /></Button>
                          {canDelete('courses') && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(course.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this course and all its content (modules, lessons, FAQs, etc.). This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Course Editor Sheet */}
      <Sheet open={editorOpen} onOpenChange={(open) => !open && setEditorOpen(false)}>
        <SheetContent className="w-full max-w-3xl overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{editingCourseId ? 'Edit Course' : 'Create New Course'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="modules">Modules</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* ── Basic Info ── */}
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={formData.title} onChange={e => setField('title', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={formData.slug} onChange={e => setField('slug', e.target.value)} placeholder="auto-generated-if-empty" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={formData.subtitle} onChange={e => setField('subtitle', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Full Description</Label>
                  <Textarea value={formData.description} onChange={e => setField('description', e.target.value)} rows={5} />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select value={formData.level} onValueChange={v => setField('level', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Select value={formData.mode} onValueChange={v => setField('mode', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Input value={formData.language} onChange={e => setField('language', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input value={formData.duration} onChange={e => setField('duration', e.target.value)} placeholder="e.g., 8 weeks" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input type="number" min="0" step="1" value={formData.price} onChange={e => setField('price', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Original Price</Label>
                    <Input type="number" min="0" step="1" value={formData.original_price} onChange={e => setField('original_price', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={formData.start_date} onChange={e => setField('start_date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setField('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.certificate_enabled} onCheckedChange={v => setField('certificate_enabled', v)} />
                  <Label>Enable Certificate</Label>
                </div>

                {/* Read-only stats */}
                {editingCourseId && (
                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    <Card>
                      <CardContent className="flex items-center justify-between py-4">
                        <span className="text-sm text-muted-foreground">Enrollment Count</span>
                        <span className="text-lg font-semibold">{enrollmentCount ?? 0}</span>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex items-center justify-between py-4">
                        <span className="text-sm text-muted-foreground">Revenue</span>
                        <span className="text-lg font-semibold">₹{(revenue ?? 0).toLocaleString()}</span>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* ── Media ── */}
              <TabsContent value="media" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Thumbnail URL</Label>
                  <Input value={formData.thumbnail_url} onChange={e => setField('thumbnail_url', e.target.value)} placeholder="https://..." />
                  {formData.thumbnail_url && <img src={formData.thumbnail_url} alt="Thumbnail" className="mt-2 h-32 rounded object-cover" />}
                </div>
                {formData.certificate_enabled && certificateTemplates && certificateTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Certificate Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                      <SelectContent>
                        {certificateTemplates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Instructor selection */}
                <div className="space-y-2">
                  <Label>Instructor</Label>
                  {instructors && instructors.length > 0 ? (
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                      <SelectContent>
                        {instructors.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">No instructors available</p>
                  )}
                </div>
              </TabsContent>

              {/* ── Modules & Lessons ── */}
              <TabsContent value="modules" className="space-y-4 pt-4">
                {modules.map((mod, mi) => (
                  <Card key={mi}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Module {mi + 1}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeModule(mi)}><X className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input placeholder="Module title" value={mod.title} onChange={e => updateModule(mi, 'title', e.target.value)} />
                      <Textarea placeholder="Module description" value={mod.description} onChange={e => updateModule(mi, 'description', e.target.value)} rows={2} />
                      
                      <Separator />
                      <div className="space-y-2 pl-4">
                        <Label className="text-xs text-muted-foreground">Lessons</Label>
                        {mod.lessons.map((les, li) => (
                          <div key={li} className="flex items-start gap-2 rounded border p-2">
                            <div className="flex-1 space-y-2">
                              <Input placeholder="Lesson title" value={les.title} onChange={e => updateLesson(mi, li, 'title', e.target.value)} />
                              <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Duration" value={les.duration} onChange={e => updateLesson(mi, li, 'duration', e.target.value)} />
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLesson(mi, li)}><X className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addLesson(mi)}>
                          <Plus className="mr-1 h-3 w-3" /> Add Lesson
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addModule}>
                  <Plus className="mr-2 h-4 w-4" /> Add Module
                </Button>
              </TabsContent>

              {/* ── Content (Outcomes + Projects) ── */}
              <TabsContent value="content" className="space-y-6 pt-4">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Learning Outcomes</Label>
                  {outcomes.map((o, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={o.outcome} onChange={e => updateOutcome(i, 'outcome', e.target.value)} placeholder="What the student will learn" />
                      <Input value={o.type} onChange={e => updateOutcome(i, 'type', e.target.value)} placeholder="Key" className="w-16" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeOutcome(i)}><X className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addOutcome}>
                    <Plus className="mr-1 h-3 w-3" /> Add Outcome
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-medium">Projects</Label>
                  {projects.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input value={p.title} onChange={e => updateProject(i, 'title', e.target.value)} placeholder="Project title" />
                        <Textarea value={p.description} onChange={e => updateProject(i, 'description', e.target.value)} placeholder="Project description" rows={2} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeProject(i)}><X className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addProject}>
                    <Plus className="mr-1 h-3 w-3" /> Add Project
                  </Button>
                </div>
              </TabsContent>

              {/* ── FAQs ── */}
              <TabsContent value="faqs" className="space-y-4 pt-4">
                {faqs.map((f, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input value={f.question} onChange={e => updateFaq(i, 'question', e.target.value)} placeholder="Question" />
                      <Textarea value={f.answer} onChange={e => updateFaq(i, 'answer', e.target.value)} placeholder="Answer" rows={2} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFaq(i)}><X className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addFaq}>
                  <Plus className="mr-2 h-4 w-4" /> Add FAQ
                </Button>
              </TabsContent>

              {/* ── Settings ── */}
              <TabsContent value="settings" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Certificate</p>
                        <p className="text-sm text-muted-foreground">Enable certificate generation for this course</p>
                      </div>
                      <Switch checked={formData.certificate_enabled} onCheckedChange={v => setField('certificate_enabled', v)} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Status</p>
                        <p className="text-sm text-muted-foreground">Control course visibility</p>
                      </div>
                      <Select value={formData.status} onValueChange={v => setField('status', v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-end gap-3 pb-6">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCourseId ? 'Save Changes' : 'Create Course'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
