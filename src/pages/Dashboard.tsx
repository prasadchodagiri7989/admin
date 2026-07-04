import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import {
  Users, BookOpen, LogIn, TrendingUp,
  Monitor, Smartphone, Globe,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function deviceIcon(ua: string | null) {
  if (!ua) return <Globe className="h-3.5 w-3.5 text-gray-400" />;
  const u = ua.toLowerCase();
  if (u.includes('mobile') || u.includes('android') || u.includes('iphone'))
    return <Smartphone className="h-3.5 w-3.5 text-blue-400" />;
  return <Monitor className="h-3.5 w-3.5 text-gray-400" />;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: adminApi.getStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading dashboard…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load stats.
      </div>
    );
  }

  const chartData = data.loginsByDay.map((d) => ({ ...d, name: fmtShort(d.date) }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Total Users" value={data.users.total}
          sub={`${data.users.newThisWeek} new this week`} color="bg-indigo-500"
        />
        <StatCard
          icon={BookOpen} label="Total Courses" value={data.courses.total}
          sub={`${data.courses.totalTopics} lessons`} color="bg-emerald-500"
        />
        <StatCard
          icon={LogIn} label="Logins Today" value={data.logins.today}
          sub={`${data.logins.thisWeek} this week`} color="bg-amber-500"
        />
        <StatCard
          icon={TrendingUp} label="Total Logins" value={data.logins.total}
          color="bg-blue-500"
        />
      </div>

      {/* Chart + recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Logins – Last 7 Days</h2>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  cursor={{ fill: '#f5f3ff' }}
                />
                <Bar dataKey="count" name="Logins" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Platform summary */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Platform Summary</h2>
          {[
            { label: 'Admins',    value: data.users.admins },
            { label: 'Students',  value: data.users.students },
            { label: 'Modules',   value: data.courses.totalModules },
            { label: 'Topics',    value: data.courses.totalTopics },
            { label: 'All-time logins', value: data.logins.total },
          ].map((r) => (
            <div key={r.label} className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{r.label}</span>
              <span className="font-semibold text-gray-800">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Login Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Device</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.recentActivity.map((a) => (
                <tr key={String(a.id)} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{a.user?.name ?? 'Deleted User'}</p>
                    <p className="text-xs text-gray-400">{a.user?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.ip}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.method === 'google'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {a.method === 'google' ? 'Google' : 'Email'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{deviceIcon(a.userAgent)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
