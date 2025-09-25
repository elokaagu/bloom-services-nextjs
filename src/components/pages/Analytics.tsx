import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  MessageSquare,
  Clock,
  Target,
  Activity
} from "lucide-react";

// Mock analytics data
const queryVolumeData = [
  { month: 'Jan', queries: 145, unique_users: 12 },
  { month: 'Feb', queries: 289, unique_users: 18 },
  { month: 'Mar', queries: 356, unique_users: 24 },
  { month: 'Apr', queries: 423, unique_users: 28 },
  { month: 'May', queries: 512, unique_users: 32 },
  { month: 'Jun', queries: 634, unique_users: 38 }
];

const documentUsageData = [
  { name: 'Data Retention Policy 2024.pdf', queries: 89, last_accessed: '2 hours ago' },
  { name: 'GDPR Compliance Guide.docx', queries: 67, last_accessed: '4 hours ago' },
  { name: 'Security Best Practices.pdf', queries: 45, last_accessed: '1 day ago' },
  { name: 'Q3 2024 Financial Report.xlsx', queries: 34, last_accessed: '3 days ago' },
  { name: 'Employee Handbook 2024.docx', queries: 28, last_accessed: '1 week ago' }
];

const responseTimeData = [
  { week: 'Week 1', avg_time: 2.3, p95_time: 4.2 },
  { week: 'Week 2', avg_time: 2.1, p95_time: 3.8 },
  { week: 'Week 3', avg_time: 2.4, p95_time: 4.1 },
  { week: 'Week 4', avg_time: 2.2, p95_time: 3.9 }
];

const topicsData = [
  { name: 'Compliance', value: 35, color: '#3B82F6' },
  { name: 'Financial', value: 25, color: '#10B981' },
  { name: 'Security', value: 20, color: '#F59E0B' },
  { name: 'HR Policies', value: 15, color: '#EF4444' },
  { name: 'Other', value: 5, color: '#8B5CF6' }
];

export const Analytics = () => {
  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="pt-[var(--header-offset)]">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Insights into document usage and query patterns
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,359</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+23.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">38</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+18.2%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">2.2s</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">-0.3s</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Indexed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+12</span> this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Query Volume Trend</span>
            </CardTitle>
            <CardDescription>
              Monthly query volume and unique user count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={queryVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="queries" fill="hsl(var(--primary))" name="Queries" />
                <Bar dataKey="unique_users" fill="hsl(var(--accent-foreground))" name="Unique Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Response Time Performance</span>
            </CardTitle>
            <CardDescription>
              Average and 95th percentile response times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avg_time" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Average (s)"
                />
                <Line 
                  type="monotone" 
                  dataKey="p95_time" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="95th Percentile (s)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Documents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Most Queried Documents</span>
            </CardTitle>
            <CardDescription>
              Documents with the highest query volume this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentUsageData.map((doc, index) => (
                <div key={doc.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last accessed: {doc.last_accessed}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-medium">
                      {doc.queries} queries
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Query Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Query Topics</CardTitle>
            <CardDescription>
              Distribution of query categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={topicsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topicsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {topicsData.map((topic) => (
                <div key={topic.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: topic.color }}
                    />
                    <span className="text-sm text-foreground">{topic.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{topic.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>
            Key insights and recommendations for your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                <span className="text-base font-semibold text-green-800">Excellent Performance</span>
              </div>
              <p className="text-sm text-green-700 leading-relaxed">
                Average response time is within target (≤2.5s)
              </p>
            </div>
            
            <div className="p-6 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" />
                <span className="text-base font-semibold text-orange-800">Optimization Opportunity</span>
              </div>
              <p className="text-sm text-orange-700 leading-relaxed">
                5 documents have low query volume - consider archiving
              </p>
            </div>
            
            <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-base font-semibold text-emerald-800">Growth Trend</span>
              </div>
              <p className="text-sm text-emerald-700 leading-relaxed">
                User adoption increased 23% this month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};