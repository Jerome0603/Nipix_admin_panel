import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  published: boolean;
}

export default function Blogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<string | null>(null);
  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    published: false,
  });

  const { user } = useAuth();
  const { canManage, canDelete } = useRoleAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blogs, isLoading } = useQuery({
    queryKey: ['blogs', searchTerm, publishedFilter],
    queryFn: async () => {
      let query = supabase
        .from('blogs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false });
      
      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }
      
      if (publishedFilter === 'published') {
        query = query.eq('published', true);
      } else if (publishedFilter === 'draft') {
        query = query.eq('published', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BlogFormData) => {
      const { error } = await supabase.from('blogs').insert([{
        ...data,
        author_id: user?.id,
        published_at: data.published ? new Date().toISOString() : null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast({ title: 'Blog created successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error creating blog', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BlogFormData }) => {
      const { error } = await supabase.from('blogs').update({
        ...data,
        published_at: data.published ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast({ title: 'Blog updated successfully' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error updating blog', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast({ title: 'Blog deleted successfully' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error deleting blog', description: error.message });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBlog(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      published: false,
    });
  };

  const handleEdit = (blog: any) => {
    setEditingBlog(blog.id);
    setFormData({
      title: blog.title,
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      published: blog.published,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blogs</h1>
          <p className="text-muted-foreground">Create and manage blog posts</p>
        </div>
        {canManage('blogs') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBlog ? 'Edit Post' : 'Create New Post'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          title: e.target.value,
                          slug: formData.slug || generateSlug(e.target.value),
                        });
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="auto-generated-from-title"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={2}
                    placeholder="Brief summary of the post..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    placeholder="Write your blog post content here... Markdown is supported."
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                  />
                  <Label htmlFor="published">Publish immediately</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingBlog ? 'Update' : 'Create'}
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
                placeholder="Search blogs..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
            >
              <option value="all">All Posts</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Blogs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Blog Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : blogs?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No blog posts found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage('blogs') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs?.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{blog.title}</p>
                        {blog.slug && (
                          <p className="text-xs text-muted-foreground">/{blog.slug}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(blog.profiles as any)?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={blog.published ? 'default' : 'secondary'}>
                        {blog.published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(blog.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    {canManage('blogs') && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(blog)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete('blogs') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(blog.id)}
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
