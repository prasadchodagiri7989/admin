import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type SuspiciousUser } from '@/api/admin';
import {
  ShieldAlert, ChevronDown, ChevronRight, AlertTriangle, Shield,
  Search, Filter, Ban, CheckCircle, Monitor, MapPin,
} from 'lucide-react';
import clsx from 'clsx';

const RISK_CONFIG = {
  critical: {
    label:   'Critical',
    classes: 'bg-red-100 text-red-700',
    row:     'bg-red-50 hover:bg-red-100',
    icon:    ShieldAlert,
  },
  high: {
    label:   'High',
    classes: 'bg-orange-100 text-orange-700',
    row:     'bg-orange-50 hover:bg-orange-100',
    icon:    AlertTriangle,
  },
  medium: {
    label:   'Medium',
    classes: 'bg-amber-100 text-amber-700',
    row:     'bg-amber-50 hover:bg-amber-100',
    icon:    Shield,
  },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function RiskBadge({ level }: { level: SuspiciousUser['riskLevel'] }) {
  const cfg = RISK_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
      cfg.classes
    )}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'blocked' }) {
  return status === 'blocked' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 text-gray-700 px-2.5 py-0.5 text-xs font-semibold">
      <Ban className="h-3 w-3" /> Blocked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">
      <CheckCircle className="h-3 w-3" /> Active
    </span>
  );
}

function SummaryCard({ level, count }: { level: keyof typeof RISK_CONFIG; count: number }) {
  const cfg = RISK_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg', cfg.classes)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{count}</p>
        <p className="text-xs text-gray-500">{cfg.label} risk user{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmDialog({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50', confirmClass)}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuspiciousActivity() {
  const queryClient = useQueryClient();
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [riskFilter,    setRiskFilter]    = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [showBlocked,   setShowBlocked]   = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; userId: string; userName: string; action: 'block' | 'unblock';
  }>({ open: false, userId: '', userName: '', action: 'block' });

  const { data: suspicious = [], isLoading } = useQuery({
    queryKey: ['suspicious'],
    queryFn: adminApi.getSuspiciousActivity,
  });

  const blockMutation = useMutation({
    mutationFn: (id: string) => adminApi.blockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suspicious'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDialog((d) => ({ ...d, open: false }));
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => adminApi.unblockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suspicious'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDialog((d) => ({ ...d, open: false }));
    },
  });

  const isActionLoading = blockMutation.isPending || unblockMutation.isPending;

  const filtered = suspicious.filter((u) => {
    if (riskFilter !== 'all' && u.riskLevel !== riskFilter) return false;
    if (showBlocked && u.status !== 'blocked') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    critical: suspicious.filter((u) => u.riskLevel === 'critical').length,
    high:     suspicious.filter((u) => u.riskLevel === 'high').length,
    medium:   suspicious.filter((u) => u.riskLevel === 'medium').length,
  };

  return (
    <>
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.action === 'block' ? 'Block User' : 'Unblock User'}
        message={
          confirmDialog.action === 'block'
            ? `Are you sure you want to block ${confirmDialog.userName}? They will be immediately prevented from logging in.`
            : `Are you sure you want to unblock ${confirmDialog.userName}? They will be able to sign in again.`
        }
        confirmLabel={confirmDialog.action === 'block' ? 'Block User' : 'Unblock User'}
        confirmClass={confirmDialog.action === 'block' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
        onConfirm={() => {
          if (confirmDialog.action === 'block') blockMutation.mutate(confirmDialog.userId);
          else unblockMutation.mutate(confirmDialog.userId);
        }}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
        loading={isActionLoading}
      />

      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suspicious Activity</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Users logged in from multiple distinct IPs. Critical: 5+ IPs | High: 3-4 IPs | Medium: 2 IPs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard level="critical" count={counts.critical} />
          <SummaryCard level="high"     count={counts.high} />
          <SummaryCard level="medium"   count={counts.medium} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Risks</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBlocked}
                onChange={(e) => setShowBlocked(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600"
              />
              Blocked only
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
              <Shield className="h-8 w-8 text-emerald-400" />
              <p className="text-sm font-medium text-gray-500">
                {suspicious.length === 0 ? 'No suspicious activity detected' : 'No results match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left w-6" />
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Risk</th>
                    <th className="px-4 py-3 text-left">IPs</th>
                    <th className="px-4 py-3 text-left">Devices</th>
                    <th className="px-4 py-3 text-left">Last Active IP</th>
                    <th className="px-4 py-3 text-left">Logins</th>
                    <th className="px-4 py-3 text-left">Last Login</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isOpen = expandedId === u.userId;
                    const sortedLogins = [...u.recentLogins].sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    return [
                      <tr
                        key={u.userId}
                        className={clsx(
                          'cursor-pointer transition-colors border-b border-gray-100 last:border-0',
                          u.status === 'blocked' ? 'bg-gray-50 hover:bg-gray-100 opacity-80' : RISK_CONFIG[u.riskLevel].row
                        )}
                        onClick={() => setExpandedId(isOpen ? null : u.userId)}
                      >
                        <td className="px-4 py-3">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                        <td className="px-4 py-3"><RiskBadge level={u.riskLevel} /></td>
                        <td className="px-4 py-3">
                          <span className={clsx('font-bold', u.riskLevel === 'critical' ? 'text-red-700' : u.riskLevel === 'high' ? 'text-orange-700' : 'text-amber-700')}>
                            {u.ipCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <Monitor className="h-3.5 w-3.5 text-gray-400" />{u.deviceCount || '0'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-600">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />{u.lastActiveIP || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.totalLogins}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.lastLogin)}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {u.status === 'blocked' ? (
                            <button
                              onClick={() => setConfirmDialog({ open: true, userId: u.userId, userName: u.name, action: 'unblock' })}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2.5 py-1 text-xs font-semibold"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDialog({ open: true, userId: u.userId, userName: u.name, action: 'block' })}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1 text-xs font-semibold"
                            >
                              <Ban className="h-3.5 w-3.5" /> Block
                            </button>
                          )}
                        </td>
                      </tr>,
                      isOpen && (
                        <tr key={`${u.userId}-detail`} className="bg-white border-b border-gray-100">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                  Known IP Addresses ({u.ipCount})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {u.distinctIPs.map((ip) => (
                                    <code key={ip} className={clsx(
                                      'rounded-md px-2.5 py-1 text-xs font-mono',
                                      ip === u.lastActiveIP ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-700'
                                    )}>
                                      {ip}{ip === u.lastActiveIP && <span className="ml-1 text-indigo-400">(last)</span>}
                                    </code>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                  Recent Login History
                                </p>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {sortedLogins.map((l, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs gap-2 flex-wrap">
                                      <code className="font-mono text-gray-600 shrink-0">{l.ip}</code>
                                      {(l.browser || l.os) && (
                                        <span className="text-gray-400 truncate text-xs">{[l.browser, l.os].filter(Boolean).join(' / ')}</span>
                                      )}
                                      <span className={clsx('rounded-full px-2 py-0.5 font-medium shrink-0', l.method === 'google' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                                        {l.method === 'google' ? 'Google' : 'Email'}
                                      </span>
                                      <span className="text-gray-400 shrink-0">{fmtDate(l.createdAt)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
