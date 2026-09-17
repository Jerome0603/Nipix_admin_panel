import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: 'enrollment' | 'payment' | 'completion';
  studentName: string;
  courseName: string;
  amount?: number;
  date: string;
}

interface RecentActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
}

export function RecentActivityTable({ activities, isLoading }: RecentActivityTableProps) {
  const getTypeBadge = (type: Activity['type']) => {
    switch (type) {
      case 'enrollment':
        return <Badge variant="secondary">Enrollment</Badge>;
      case 'payment':
        return <Badge variant="outline" className="border-primary/30 text-primary">Payment</Badge>;
      case 'completion':
        return <Badge variant="default">Completion</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest enrollments, payments, and course completions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">No recent activity</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{getTypeBadge(activity.type)}</TableCell>
                  <TableCell className="font-medium">{activity.studentName}</TableCell>
                  <TableCell>{activity.courseName}</TableCell>
                  <TableCell>
                    {activity.amount ? `$${activity.amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(activity.date), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
