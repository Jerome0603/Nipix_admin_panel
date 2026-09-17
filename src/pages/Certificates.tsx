import { ChangeEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Award, ShieldCheck, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

type CertificateStatus = 'pending' | 'approved' | 'Verified';

type Certificates = {
  id: string;
  certificate_id: string;
  student_name: string;
  course_name: string;
  created_at: string | null;
  issued_at: string;
  status: string | null;
  issued_by: string | null;
  certificate_file_path: string | null;
};

type CertificateFormState = {
  student_name: string;
  certificate_id: string;
  course_name: string;
  status: CertificateStatus;
  created_at: string;
  issued_at: string;
  issued_by: string;
};

const CERTIFICATE_BUCKET = 'certificates';

export default function Certificates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<CertificateFormState>({
    student_name: '',
    certificate_id: '',
    course_name: '',
    status: 'pending',
    created_at: new Date().toISOString().split('T')[0],
    issued_at: new Date().toISOString().split('T')[0],
    issued_by: '',
  });

  const { canManage, isSuperAdmin } = useRoleAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetCreateForm = () => {
    setSelectedFile(null);
    setFormData({
      student_name: '',
      certificate_id: '',
      course_name: '',
      status: 'pending',
      created_at: new Date().toISOString().split('T')[0],
      issued_at: new Date().toISOString().split('T')[0],
      issued_by: '',
    });
  };

  const handleCreateDialogChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      resetCreateForm();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const { data: stats } = useQuery({
    queryKey: ['certificate-stats'],
    queryFn: async () => {
      const [pending, approved, issued, verified] = await Promise.all([
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).not('issued_at', 'is', null),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).ilike('status', 'verified'),
      ]);
      return {
        pending: pending.count ?? 0,
        approved: approved.count ?? 0,
        issued: issued.count ?? 0,
        verified: verified.count ?? 0,
      };
    },
  });

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.ilike('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(
          `certificate_id.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%,course_name.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Certificates[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CertificateStatus }) => {
      const { error } = await supabase.from('certificates').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      toast({ title: `Certificate ${status}` });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error updating certificate', description: error.message });
    },
  });

  const createCertificateMutation = useMutation({
    mutationFn: async ({ values, file }: { values: CertificateFormState; file: File }) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        throw new Error('Please upload a PDF file.');
      }

      const sanitizedCertificateId = values.certificate_id.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
      const filePath = `${sanitizedCertificateId}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage.from(CERTIFICATE_BUCKET).upload(filePath, file, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('certificates').insert({
        student_name: values.student_name.trim(),
        certificate_id: values.certificate_id.trim(),
        course_name: values.course_name.trim(),
        status: values.status,
        created_at: values.created_at ? new Date(`${values.created_at}T00:00:00`).toISOString() : undefined,
        issued_at: values.issued_at,
        issued_by: values.issued_by.trim() || null,
        certificate_file_path: filePath,
      });

      if (insertError) {
        await supabase.storage.from(CERTIFICATE_BUCKET).remove([filePath]);
        throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      toast({ title: 'Certificate created successfully' });
      handleCreateDialogChange(false);
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error creating certificate', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (certificate: Certificates) => {
      if (certificate.certificate_file_path) {
        const { error: storageError } = await supabase.storage.from(CERTIFICATE_BUCKET).remove([certificate.certificate_file_path]);
        if (storageError) throw storageError;
      }

      const { error } = await supabase.from('certificates').delete().eq('id', certificate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      toast({ title: 'Certificate deleted' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error deleting certificate', description: error.message });
    },
  });

  const getStatusBadge = (status?: string | null) => {
    if (!status) return '-';

    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-primary text-primary">Approved</Badge>;
      case 'verified':
        return <Badge className="bg-green-600 text-white">Verified</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
        <p className="text-muted-foreground">Manage certificate issuance and verification</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{stats?.pending ?? <Skeleton className="h-8 w-12" />}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl">{stats?.approved ?? <Skeleton className="h-8 w-12" />}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Issued</CardDescription>
            <CardTitle className="text-2xl">{stats?.issued ?? <Skeleton className="h-8 w-12" />}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified</CardDescription>
            <CardTitle className="text-2xl">{stats?.verified ?? <Skeleton className="h-8 w-12" />}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student, course, or certificate ID..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="Verified">Verified</SelectItem>
              </SelectContent>
            </Select>
            {canManage('certificates') && (
              <Button onClick={() => handleCreateDialogChange(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Certificate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certificate List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : certificates?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No certificates found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Issued</TableHead>
                  {canManage('certificates') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates?.map((cert) => {
                  return (
                    <TableRow key={cert.id}>
                      <TableCell className="font-mono text-sm">{cert.certificate_id}</TableCell>
                      <TableCell className="font-medium">{cert.student_name || 'Unknown'}</TableCell>
                      <TableCell>{cert.course_name || 'Unknown'}</TableCell>
                      <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cert.created_at ? format(new Date(cert.created_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cert.issued_at ? format(new Date(cert.issued_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      {canManage('certificates') && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {cert.status?.toLowerCase() === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate({ id: cert.id, status: 'approved' })} disabled={updateStatusMutation.isPending}>
                                <Award className="mr-1 h-3 w-3" />Approve
                              </Button>
                            )}
                            {cert.status?.toLowerCase() === 'approved' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: cert.id, status: 'Verified' })} disabled={updateStatusMutation.isPending}>
                                <ShieldCheck className="mr-1 h-3 w-3" />Verify
                              </Button>
                            )}
                            {isSuperAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete certificate?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete certificate {cert.certificate_id}.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(cert)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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

      <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Certificate</DialogTitle>
            <DialogDescription>
              Add the certificate details and upload the PDF file in one step.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student-name">Student Name</Label>
              <Input
                id="student-name"
                value={formData.student_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, student_name: e.target.value }))}
                disabled={createCertificateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-id">Certificate ID</Label>
              <Input
                id="certificate-id"
                value={formData.certificate_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, certificate_id: e.target.value }))}
                disabled={createCertificateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-name">Course</Label>
              <Input
                id="course-name"
                value={formData.course_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, course_name: e.target.value }))}
                disabled={createCertificateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as CertificateStatus }))}
              >
                <SelectTrigger id="certificate-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="created-at">Created On</Label>
              <Input
                id="created-at"
                type="date"
                value={formData.created_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, created_at: e.target.value }))}
                disabled={createCertificateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issued-at">Issued On</Label>
              <Input
                id="issued-at"
                type="date"
                value={formData.issued_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, issued_at: e.target.value }))}
                disabled={createCertificateMutation.isPending}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="issued-by">Issued By</Label>
              <Input
                id="issued-by"
                value={formData.issued_by}
                onChange={(e) => setFormData((prev) => ({ ...prev, issued_by: e.target.value }))}
                disabled={createCertificateMutation.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate-pdf">Certificate PDF</Label>
            <Input
              id="certificate-pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={createCertificateMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              {selectedFile ? `Selected file: ${selectedFile.name}` : 'Only PDF files are allowed.'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCreateDialogChange(false)}
              disabled={createCertificateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => selectedFile && createCertificateMutation.mutate({ values: formData, file: selectedFile })}
              disabled={
                !formData.student_name.trim() ||
                !formData.certificate_id.trim() ||
                !formData.course_name.trim() ||
                !formData.issued_at ||
                !selectedFile ||
                createCertificateMutation.isPending
              }
            >
              {createCertificateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Certificate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
