import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase.from('students').select('*').order('created_at', { ascending: false });
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: studentDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['student-details', selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return null;
      
      const [enrollmentsRes, paymentsRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('*, courses(title)')
          .eq('student_id', selectedStudent),
        supabase
          .from('payments')
          .select('*, courses(title)')
          .eq('student_id', selectedStudent)
          .order('created_at', { ascending: false }),
      ]);
      
      return {
        enrollments: enrollmentsRes.data || [],
        payments: paymentsRes.data || [],
      };
    },
    enabled: !!selectedStudent,
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['student-enrollment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('student_id, progress');
      
      if (error) throw error;
      
      const counts: Record<string, { count: number; avgProgress: number }> = {};
      data.forEach((e) => {
        if (!counts[e.student_id]) {
          counts[e.student_id] = { count: 0, avgProgress: 0 };
        }
        counts[e.student_id].count += 1;
        counts[e.student_id].avgProgress += e.progress;
      });
      
      Object.keys(counts).forEach((k) => {
        counts[k].avgProgress = Math.round(counts[k].avgProgress / counts[k].count);
      });
      
      return counts;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="text-muted-foreground">Manage student enrollments and progress</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : students?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No students found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled Courses</TableHead>
                  <TableHead>Avg Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students?.map((student) => {
                  const stats = enrollmentCounts?.[student.id] || { count: 0, avgProgress: 0 };
                  
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{student.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.email}</TableCell>
                      <TableCell>{stats.count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={stats.avgProgress} className="h-2 w-16" />
                          <span className="text-sm text-muted-foreground">{stats.avgProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(student.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(student.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold">Enrolled Courses</h3>
                {studentDetails?.enrollments.length === 0 ? (
                  <p className="text-muted-foreground">No enrollments</p>
                ) : (
                  <div className="space-y-3">
                    {studentDetails?.enrollments.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="font-medium">{e.courses?.title}</span>
                        <div className="flex items-center gap-3">
                          <Progress value={e.progress} className="h-2 w-24" />
                          <span className="text-sm text-muted-foreground">{e.progress}%</span>
                          <Badge variant={e.status === 'completed' ? 'default' : 'secondary'}>
                            {e.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-3 font-semibold">Payment History</h3>
                {studentDetails?.payments.length === 0 ? (
                  <p className="text-muted-foreground">No payments</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentDetails?.payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.courses?.title}</TableCell>
                          <TableCell>${Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(p.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
