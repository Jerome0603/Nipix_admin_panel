import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { EnrollmentsChart } from '@/components/dashboard/EnrollmentsChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Briefcase, Calendar, ClipboardList, Loader2, Users, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

export default function Dashboard() {
  const [realtimeRegistrations, setRealtimeRegistrations] = useState<any[]>([]);

  // Fetch metrics
  const { data: coursesCount } = useQuery({
    queryKey: ['courses-count'],
    queryFn: async () => {
      const { count } = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published');
      return count || 0;
    },
  });

  const { data: internshipsCount } = useQuery({
    queryKey: ['internships-count'],
    queryFn: async () => {
      const { count } = await supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'published');
      return count || 0;
    },
  });

  const { data: eventsCount } = useQuery({
    queryKey: ['events-count'],
    queryFn: async () => {
      const { count } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published');
      return count || 0;
    },
  });

  // Registration counts by time period
  const { data: registrationStats, refetch: refetchStats } = useQuery({
    queryKey: ['registration-stats'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = startOfWeek(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();

      const [todayRes, weekRes, monthRes, totalRes] = await Promise.all([
        supabase.from('registrations').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('registrations').select('*', { count: 'exact', head: true }),
      ]);

      return {
        today: todayRes.count || 0,
        week: weekRes.count || 0,
        month: monthRes.count || 0,
        total: totalRes.count || 0,
      };
    },
  });

  // Registration breakdown by type
  const { data: typeBreakdown, refetch: refetchBreakdown } = useQuery({
    queryKey: ['registration-breakdown'],
    queryFn: async () => {
      const types = ['course', 'internship', 'event', 'workshop', 'seminar', 'vac'] as const;
      const results = await Promise.all(
        types.map(async (type) => {
          const { count } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('registration_type', type);
          return { type, count: count || 0 };
        })
      );
      return results;
    },
  });

  // Fetch recent registrations
  const { data: recentRegistrations, isLoading: registrationsLoading, refetch: refetchRecent } = useQuery({
    queryKey: ['recent-registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for new registrations
  useEffect(() => {
    const channel = supabase
      .channel('registrations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'registrations',
        },
        (payload) => {
          setRealtimeRegistrations(prev => [payload.new, ...prev].slice(0, 5));
          // Refetch stats when new registration comes in
          refetchStats();
          refetchBreakdown();
          refetchRecent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchStats, refetchBreakdown, refetchRecent]);

  // Fetch enrollments per course for chart
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments-per-course'],
    queryFn: async () => {
      const { data: courses } = await supabase.from('courses').select('id, title').eq('status', 'published').limit(6);
      
      if (!courses) return [];
      
      const result = await Promise.all(
        courses.map(async (course) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);
          
          return {
            course: course.title.length > 15 ? course.title.substring(0, 15) + '...' : course.title,
            enrollments: count || 0,
          };
        })
      );
      
      return result;
    },
  });

  // Fetch monthly revenue for chart
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'paid')
        .order('created_at', { ascending: true });
      
      if (!data) return [];
      
      const monthlyData: Record<string, number> = {};
      
      data.forEach((payment) => {
        const month = new Date(payment.created_at).toLocaleString('default', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + Number(payment.amount);
      });
      
      return Object.entries(monthlyData).map(([month, revenue]) => ({ month, revenue }));
    },
  });

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      course: 'default',
      internship: 'secondary',
      event: 'outline',
      workshop: 'outline',
      seminar: 'outline',
      vac: 'secondary',
    };
    return <Badge variant={variants[type] || 'outline'}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      new: 'secondary',
      contacted: 'outline',
      converted: 'default',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Nipix Technology admin dashboard</p>
      </div>

      {/* Registration Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Registrations"
          value={registrationStats?.today || 0}
          icon={TrendingUp}
          description="registrations today"
        />
        <MetricCard
          title="This Week"
          value={registrationStats?.week || 0}
          icon={Users}
          description="registrations this week"
        />
        <MetricCard
          title="This Month"
          value={registrationStats?.month || 0}
          icon={ClipboardList}
          description="registrations this month"
        />
        <MetricCard
          title="Total Registrations"
          value={registrationStats?.total || 0}
          icon={ClipboardList}
          trend={{ value: 15, isPositive: true }}
          description="all time"
        />
      </div>

      {/* Content Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Published Courses"
          value={coursesCount || 0}
          icon={BookOpen}
          description="active courses"
        />
        <MetricCard
          title="Internships"
          value={internshipsCount || 0}
          icon={Briefcase}
          description="active internships"
        />
        <MetricCard
          title="Events"
          value={eventsCount || 0}
          icon={Calendar}
          description="upcoming events"
        />
      </div>

      {/* Registration Breakdown by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Registrations by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {typeBreakdown?.map(({ type, count }) => (
              <div key={type} className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{type === 'vac' ? 'VAC' : type}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <EnrollmentsChart data={enrollmentsData || []} isLoading={enrollmentsLoading} />
        <RevenueChart data={revenueData || []} isLoading={revenueLoading} />
      </div>

      {/* Real-time New Registrations Alert */}
      {realtimeRegistrations.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              New Registrations (Real-time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {realtimeRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.name}</TableCell>
                    <TableCell>{reg.email}</TableCell>
                    <TableCell>{getTypeBadge(reg.registration_type)}</TableCell>
                    <TableCell className="text-muted-foreground">Just now</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {registrationsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentRegistrations?.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No registrations yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRegistrations?.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.name}</TableCell>
                    <TableCell className="text-muted-foreground">{reg.email}</TableCell>
                    <TableCell>{getTypeBadge(reg.registration_type)}</TableCell>
                    <TableCell>{getStatusBadge(reg.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(reg.created_at), 'MMM d, yyyy')}
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
