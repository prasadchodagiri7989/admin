import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, LogIn, TrendingUp,
  Monitor, Smartphone, Globe, Plus, Database, AlertTriangle, CheckCircle2, X, RefreshCw
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
  const queryClient = useQueryClient();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    stats: { collection: string; count: number }[];
    totalDocuments: number;
    totalCollections: number;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: adminApi.getStats,
  });

  const syncMutation = useMutation({
    mutationFn: adminApi.syncProdToUat,
    onSuccess: (res) => {
      setSyncResult(res);
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-wrap gap-3">
          {/* Copy Prod to UAT Button */}
          <button
            onClick={() => {
              setSyncResult(null);
              setSyncModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 px-3.5 py-2 text-sm font-medium transition-colors shadow-sm"
            title="Copy database records from Production to UAT"
          >
            <Database className="h-4 w-4" /> Copy Prod to UAT
          </button>

          <Link
            to="/courses?create=true"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Course
          </Link>
          <Link
            to="/batches?create=true"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Batch
          </Link>
        </div>
      </div>

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

      {/* Copy Prod to UAT Confirmation & Progress Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Copy Data: Prod to UAT</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Database synchronization</p>
                </div>
              </div>
              {!syncMutation.isPending && (
                <button
                  onClick={() => {
                    setSyncModalOpen(false);
                    setSyncResult(null);
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {syncResult ? (
                /* Success View */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Synchronization Successful!</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">{syncResult.message}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-slate-800 p-4 space-y-2.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-100 dark:border-slate-800">
                      <span>Collection</span>
                      <span>Documents Copied</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {syncResult.stats.map((s) => (
                        <div key={s.collection} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                          <code className="font-mono text-gray-700 dark:text-slate-300 font-medium">{s.collection}</code>
                          <span className="font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700">
                            {s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-800 dark:text-slate-200">
                      <span>Total Documents Synced</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{syncResult.totalDocuments}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Confirmation View */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1 leading-relaxed">
                      <p className="font-semibold text-sm">Destructive Overwrite Warning</p>
                      <p>
                        This will copy all collections and documents from <strong>Production (lms-backend)</strong> into <strong>UAT (lms-backend-uat)</strong>.
                      </p>
                      <p className="text-amber-700 dark:text-amber-400/90">
                        Existing data in UAT will be replaced to exactly match current production data.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl bg-gray-50 dark:bg-slate-800/40 p-4 border border-gray-200/80 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-slate-400">Source (Production):</span>
                      <code className="font-mono font-medium text-gray-800 dark:text-slate-200">lms-backend</code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-slate-400">Destination (UAT):</span>
                      <code className="font-mono font-medium text-amber-600 dark:text-amber-400">lms-backend-uat</code>
                    </div>
                  </div>

                  {syncMutation.isError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
                      Sync failed: {(syncMutation.error as Error)?.message || 'Internal connection error.'}
                    </div>
                  )}

                  {syncMutation.isPending && (
                    <div className="flex items-center justify-center gap-3 py-4 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Synchronizing collections from Prod to UAT...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
              {syncResult ? (
                <button
                  onClick={() => {
                    setSyncModalOpen(false);
                    setSyncResult(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setSyncModalOpen(false)}
                    disabled={syncMutation.isPending}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {syncMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Copying...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        Confirm & Copy Now
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
