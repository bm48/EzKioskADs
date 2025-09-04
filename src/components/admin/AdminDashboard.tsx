import React from 'react';
import { Users, Monitor, CheckSquare, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import MetricsCard from '../shared/MetricsCard';
import RecentActivity from '../shared/RecentActivity';
import QuickActions from '../shared/QuickActions';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function AdminDashboard() {
  const metrics = [
    {
      title: 'Total Users',
      value: '1,485',
      change: '+18% this month',
      changeType: 'positive' as const,
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Active Kiosks',
      value: '25',
      change: '+3 this week',
      changeType: 'positive' as const,
      icon: Monitor,
      color: 'blue'
    },
    {
      title: 'Pending Reviews',
      value: '12',
      change: '-8 from yesterday',
      changeType: 'positive' as const,
      icon: CheckSquare,
      color: 'orange'
    },
    {
      title: 'Platform Revenue',
      value: '$89,750',
      change: '+28% this month',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'green'
    }
  ];

  const quickActions = [
    {
      title: 'Review Queue',
      description: 'Process pending ad approvals',
      href: '/admin/review',
      icon: CheckSquare,
      color: 'purple'
    },
    {
      title: 'User Management',
      description: 'Manage client and host accounts',
      href: '/admin/users',
      icon: Users,
      color: 'blue'
    }
  ];

  const recentActivities = [
    { action: 'New host "Travel Media" registered', time: '15 minutes ago', type: 'info' },
    { action: '12 ads approved in batch review', time: '1 hour ago', type: 'success' },
    { action: 'System maintenance completed', time: '3 hours ago', type: 'success' },
    { action: 'New kiosk K-025 added to network', time: '5 hours ago', type: 'info' },
    { action: '5 new coupons created for Q1 promotions', time: '1 day ago', type: 'info' },
    { action: 'Monthly revenue target exceeded by 15%', time: '2 days ago', type: 'success' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2">Monitor platform activity and manage system operations</p>
      </div>

      {/* System Alerts */}
      <Card className="animate-fade-in-up bg-yellow-50/60 dark:bg-yellow-500/10 border-yellow-200/60 dark:border-yellow-600/30" title="System Notice">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-700 dark:text-yellow-400 mt-0.5" />
          <p className="text-sm">Scheduled maintenance window: Jan 25, 2025 at 2:00 AM - 4:00 AM PST</p>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
            <MetricsCard {...metric} />
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 animate-fade-in-up" title="Quick Actions" subtitle="Administrative tasks">
          <div className="space-y-3">
            {quickActions.map((qa) => (
              <div key={qa.title} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <qa.icon className="w-5 h-5 text-primary-600" />
                  <div>
                    <div className="font-medium">{qa.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{qa.description}</div>
                  </div>
                </div>
                <Button variant="secondary" size="sm">Open</Button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 animate-fade-in-up" title="Recent Activity" subtitle="Latest platform updates">
          <RecentActivity activities={recentActivities} />
        </Card>
      </div>

      {/* Platform Overview Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card className="animate-fade-in-up" title="User Growth">
          <div className="h-64 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-800 dark:to-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Users className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <p>User registration trends</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Clients, hosts, and total platform growth</p>
            </div>
          </div>
        </Card>

        {/* Revenue Analytics */}
        <Card className="animate-fade-in-up" title="Platform Revenue">
          <div className="h-64 bg-gradient-to-br from-success-50 to-primary-50 dark:from-gray-800 dark:to-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-success-600 mx-auto mb-4" />
              <p>Revenue breakdown and trends</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Commission, fees, and marketplace sales</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}