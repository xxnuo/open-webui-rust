import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Users, MessageSquare, Clock } from 'lucide-react';

interface AnalyticsData {
  total_users: number;
  active_users: number;
  total_messages: number;
  total_chats: number;
  avg_response_time: number;
  user_growth: number;
  message_growth: number;
}

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    total_users: 0,
    active_users: 0,
    total_messages: 0,
    total_chats: 0,
    avg_response_time: 0,
    user_growth: 0,
    message_growth: 0
  });

  useEffect(() => {
    // Fetch analytics data
    // This is a placeholder - implement actual API call
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // const data = await getAnalytics(localStorage.token, timeRange);
        // setAnalyticsData(data);
        
        // Mock data for now
        setTimeout(() => {
          setAnalyticsData({
            total_users: 1234,
            active_users: 567,
            total_messages: 12345,
            total_chats: 5678,
            avg_response_time: 1.5,
            user_growth: 12.5,
            message_growth: 23.4
          });
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  const StatCard = ({ title, value, subtitle, icon: Icon, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {t('from last period')}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('Analytics')}</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">{t('Last 24 Hours')}</SelectItem>
            <SelectItem value="7d">{t('Last 7 Days')}</SelectItem>
            <SelectItem value="30d">{t('Last 30 Days')}</SelectItem>
            <SelectItem value="90d">{t('Last 90 Days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('Total Users')}
          value={analyticsData.total_users.toLocaleString()}
          subtitle={`${analyticsData.active_users} ${t('active')}`}
          icon={Users}
          trend={analyticsData.user_growth}
        />
        <StatCard
          title={t('Total Messages')}
          value={analyticsData.total_messages.toLocaleString()}
          icon={MessageSquare}
          trend={analyticsData.message_growth}
        />
        <StatCard
          title={t('Total Chats')}
          value={analyticsData.total_chats.toLocaleString()}
          icon={MessageSquare}
        />
        <StatCard
          title={t('Avg Response Time')}
          value={`${analyticsData.avg_response_time}s`}
          icon={Clock}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="users">{t('Users')}</TabsTrigger>
          <TabsTrigger value="messages">{t('Messages')}</TabsTrigger>
          <TabsTrigger value="models">{t('Models')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Usage Overview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                {t('Chart visualization coming soon')}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('Top Models')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">GPT-4</span>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Claude</span>
                    <span className="text-sm font-medium">30%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gemini</span>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Peak Usage Hours')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-gray-400">
                  {t('Heatmap visualization coming soon')}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('User Activity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                {t('User activity chart coming soon')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Message Volume')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                {t('Message volume chart coming soon')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Model Usage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                {t('Model usage chart coming soon')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

