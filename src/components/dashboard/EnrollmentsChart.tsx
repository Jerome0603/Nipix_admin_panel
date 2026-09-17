import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface EnrollmentData {
  course: string;
  enrollments: number;
}

interface EnrollmentsChartProps {
  data: EnrollmentData[];
  isLoading?: boolean;
}

const chartConfig = {
  enrollments: {
    label: "Enrollments",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function EnrollmentsChart({ data, isLoading }: EnrollmentsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollments per Course</CardTitle>
        <CardDescription>Number of students enrolled in each course</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" />
                <YAxis dataKey="course" type="category" width={100} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="enrollments" fill="var(--color-enrollments)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
