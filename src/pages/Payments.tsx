import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Loader2, DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { MetricCard } from '@/components/dashboard/MetricCard';

type PaymentStatus = 'paid' | 'pending' | 'refunded';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*, students(name, email), courses(title)')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as PaymentStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (searchTerm) {
        return data.filter((p) => 
          (p.students as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.courses as any)?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return data;
    },
  });

  const { data: revenueByCourse } = useQuery({
    queryKey: ['revenue-by-course'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, courses(id, title)')
        .eq('status', 'paid');
      
      if (error) throw error;
      
      const revenue: Record<string, { title: string; amount: number }> = {};
      data.forEach((p) => {
        const courseId = (p.courses as any)?.id;
        const courseTitle = (p.courses as any)?.title || 'Unknown';
        
        if (courseId) {
          if (!revenue[courseId]) {
            revenue[courseId] = { title: courseTitle, amount: 0 };
          }
          revenue[courseId].amount += Number(p.amount);
        }
      });
      
      return Object.values(revenue).sort((a, b) => b.amount - a.amount);
    },
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'refunded':
        return <Badge variant="destructive">Refunded</Badge>;
    }
  };

  const totalRevenue = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const pendingAmount = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const transactionCount = payments?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">View transactions and revenue summaries</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          description="from paid transactions"
        />
        <MetricCard
          title="Pending Amount"
          value={`$${pendingAmount.toLocaleString()}`}
          icon={TrendingUp}
          description="awaiting payment"
        />
        <MetricCard
          title="Total Transactions"
          value={transactionCount}
          icon={CreditCard}
          description="all time"
        />
      </div>

      {/* Revenue by Course */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Course</CardTitle>
          <CardDescription>Top performing courses by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueByCourse?.length === 0 ? (
            <p className="text-muted-foreground">No revenue data</p>
          ) : (
            <div className="space-y-3">
              {revenueByCourse?.slice(0, 5).map((course, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{course.title}</span>
                  <span className="font-semibold text-primary">${course.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student, course, or transaction ID..."
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
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.transaction_id || payment.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">{(payment.students as any)?.name || 'Unknown'}</TableCell>
                    <TableCell>{(payment.courses as any)?.title || 'Unknown'}</TableCell>
                    <TableCell className="font-semibold">${Number(payment.amount).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(payment.created_at), 'MMM d, yyyy')}
                    </TableCell>
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
