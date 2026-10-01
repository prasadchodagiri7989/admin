import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type SuspiciousUser } from '@/api/admin';
import {
  ShieldAlert, ChevronDown, ChevronRight, AlertTriangle, Shield,
  Search, Filter, Ban, CheckCircle, Monitor, MapPin,
  RotateCcw, Eye, Camera, X, UserCheck, ShieldCheck, Calendar, Globe
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL as string;
const BACKEND_URL = API_BASE ? API_BASE.replace('/api', '') : 'http://localhost:5000';

const RISK_CONFIG = {
  critical: {
    label:   'Critical',
    classes: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 dark:border dark:border-red-800/40',
    row:     'bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/40',
    icon:    ShieldAlert,
  },
  high: {
    label:   'High',
    classes: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 dark:border dark:border-orange-800/40',
    row:     'bg-orange-50/70 hover:bg-orange-100/70 dark:bg-orange-950/20 dark:hover:bg-orange-950/40',
    icon:    AlertTriangle,
  },
  medium: {
    label:   'Medium',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 dark:border dark:border-amber-800/40',
    row:     'bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/40',
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
    open: boolean;
    userId: string;
    userName: string;
    action: 'block' | 'unblock' | 'reset-ips';
    targetIp?: string;
  }>({ open: false, userId: '', userName: '', action: 'block' });

  const [selectedFaceImage, setSelectedFaceImage] = useState<{
    url: string;
    userName: string;
    userEmail: string;
    time: string;
    ip: string;
  } | null>(null);

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

  const resetIpsMutation = useMutation({
    mutationFn: ({ userId, ip }: { userId: string; ip?: string }) => adminApi.resetUserIps(userId, ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suspicious'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setConfirmDialog((d) => ({ ...d, open: false }));
    },
  });

  const isActionLoading = blockMutation.isPending || unblockMutation.isPending || resetIpsMutation.isPending;

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
        title={
          confirmDialog.action === 'block'
            ? 'Block User'
            : confirmDialog.action === 'unblock'
            ? 'Unblock User'
            : confirmDialog.targetIp
            ? `Reset IP ${confirmDialog.targetIp}`
            : 'Reset IP Addresses'
        }
        message={
          confirmDialog.action === 'block'
            ? `Are you sure you want to block ${confirmDialog.userName}? They will be immediately prevented from logging in.`
            : confirmDialog.action === 'unblock'
            ? `Are you sure you want to unblock ${confirmDialog.userName}? They will be able to sign in again.`
            : confirmDialog.targetIp
            ? `Are you sure you want to reset IP ${confirmDialog.targetIp} for ${confirmDialog.userName}? This will re-assign this address to their latest active IP in login history.`
            : `Are you sure you want to reset all past IP addresses for ${confirmDialog.userName}? Their IP address history will be synced to their latest active IP, clearing multi-IP suspicious alerts.`
        }
        confirmLabel={
          confirmDialog.action === 'block'
            ? 'Block User'
            : confirmDialog.action === 'unblock'
            ? 'Unblock User'
            : confirmDialog.targetIp
            ? 'Reset IP'
            : 'Reset All IPs'
        }
        confirmClass={
          confirmDialog.action === 'block'
            ? 'bg-red-600 hover:bg-red-700'
            : confirmDialog.action === 'unblock'
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }
        onConfirm={() => {
          if (confirmDialog.action === 'block') {
            blockMutation.mutate(confirmDialog.userId);
          } else if (confirmDialog.action === 'unblock') {
            unblockMutation.mutate(confirmDialog.userId);
          } else {
            resetIpsMutation.mutate({ userId: confirmDialog.userId, ip: confirmDialog.targetIp });
          }
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
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isOpen = expandedId === u.userId;
                    const sortedLogins = [...u.recentLogins].sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    const ipItems = u.ipDetails && u.ipDetails.length > 0
                      ? u.ipDetails
                      : u.distinctIPs.map(ip => ({ ip, count: 1 }));

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
                          {u.phone && <p className="text-[11px] text-emerald-600 font-mono mt-0.5">{u.phone}</p>}
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
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setConfirmDialog({
                                open: true,
                                userId: u.userId,
                                userName: u.name,
                                action: 'reset-ips'
                              })}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 text-xs font-semibold transition-colors"
                              title="Reset all IPs to latest active IP"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Reset IPs
                            </button>
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
                          </div>
                        </td>
                      </tr>,
                      isOpen && (
                        <tr key={`${u.userId}-detail`} className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Left column: Known IP Addresses with login counts and individual/bulk reset */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Known IP Addresses ({u.ipCount})
                                  </p>
                                  <button
                                    onClick={() => setConfirmDialog({
                                      open: true,
                                      userId: u.userId,
                                      userName: u.name,
                                      action: 'reset-ips'
                                    })}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                                  >
                                    <RotateCcw className="h-3 w-3" /> Reset all to latest
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {ipItems.map(({ ip, count }) => {
                                    const isLast = ip === u.lastActiveIP;
                                    return (
                                      <div
                                        key={ip}
                                        className={clsx(
                                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono border transition-all',
                                          isLast
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 font-semibold shadow-xs'
                                            : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                        )}
                                      >
                                        <span>{ip}</span>
                                        <span className={clsx(
                                          'text-[11px] font-sans px-1.5 py-0.5 rounded-full font-medium',
                                          isLast
                                            ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                                        )}>
                                          ({count} {count === 1 ? 'login' : 'logins'})
                                        </span>
                                        {isLast && (
                                          <span className="text-[10px] font-sans font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1 rounded border border-indigo-200 dark:border-indigo-800">
                                            latest
                                          </span>
                                        )}
                                        {!isLast && (
                                          <button
                                            onClick={() => setConfirmDialog({
                                              open: true,
                                              userId: u.userId,
                                              userName: u.name,
                                              action: 'reset-ips',
                                              targetIp: ip
                                            })}
                                            title={`Reset IP ${ip}`}
                                            className="ml-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded transition-colors"
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right column: Recent Login History with face captures */}
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                  Recent Login History & Face Captures
                                </p>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                  {sortedLogins.map((l, i) => {
                                    const hasFace = !!l.faceCard;
                                    const faceUrl = hasFace ? `${BACKEND_URL}${l.faceCard}` : '';
                                    return (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-800/50 px-3 py-2 text-xs gap-3 border border-gray-100 dark:border-slate-800 hover:bg-gray-100/70 dark:hover:bg-slate-800/80 transition-colors"
                                      >
                                        {/* Biometric Face Card Thumbnail */}
                                        <div className="flex items-center gap-2.5">
                                          {hasFace ? (
                                            <button
                                              onClick={() => setSelectedFaceImage({
                                                url: faceUrl,
                                                userName: u.name,
                                                userEmail: u.email,
                                                time: fmtDate(l.createdAt),
                                                ip: l.ip
                                              })}
                                              className="relative group shrink-0"
                                              title="Click to view biometric face capture"
                                            >
                                              <div className="h-9 w-9 rounded-lg overflow-hidden border border-indigo-200 shadow-xs relative group-hover:border-indigo-500 transition-colors">
                                                <img
                                                  src={faceUrl}
                                                  alt="Biometric face capture"
                                                  className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                                                />
                                                <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                  <Eye className="h-3.5 w-3.5 text-white" />
                                                </div>
                                              </div>
                                            </button>
                                          ) : (
                                            <div
                                              className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-slate-500 shrink-0"
                                              title="No biometric face photo recorded for this session"
                                            >
                                              <Camera className="h-4 w-4" />
                                            </div>
                                          )}
                                          <div className="flex flex-col">
                                            <code className="font-mono text-gray-700 dark:text-slate-200 font-semibold">{l.ip}</code>
                                            {hasFace ? (
                                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-0.5">
                                                <CheckCircle className="h-2.5 w-2.5" /> Face captured
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-gray-400 dark:text-slate-500">No face photo</span>
                                            )}
                                          </div>
                                        </div>

                                        {(l.browser || l.os) && (
                                          <span className="text-gray-500 dark:text-slate-400 truncate text-xs hidden sm:inline">
                                            {[l.browser, l.os].filter(Boolean).join(' / ')}
                                          </span>
                                        )}
                                        <span className={clsx(
                                          'rounded-full px-2 py-0.5 font-medium shrink-0 text-[11px]',
                                          l.method === 'google'
                                            ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                                        )}>
                                          {l.method === 'google' ? 'Google' : 'Email'}
                                        </span>
                                        <span className="text-gray-400 shrink-0 text-right">{fmtDate(l.createdAt)}</span>
                                      </div>
                                    );
                                  })}
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

      {/* Face Capture Photo Modal */}
      {selectedFaceImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedFaceImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Biometric Face Verification</h3>
                  <p className="text-[10px] text-slate-400">Captured at login initialization</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFaceImage(null)}
                className="h-8 w-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Photo viewport */}
            <div className="p-6 bg-slate-950/50 flex flex-col items-center justify-center">
              <div className="relative group max-w-xs w-full aspect-square rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-inner">
                <img
                  src={selectedFaceImage.url}
                  alt="Biometric Capture"
                  className="w-full h-full object-cover"
                />
                {/* HUD Framing overlay */}
                <div className="absolute inset-0 border border-indigo-500/30 rounded-2xl pointer-events-none">
                  <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-indigo-400/80" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-indigo-400/80" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-indigo-400/80" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-indigo-400/80" />
                </div>
              </div>
            </div>

            {/* Meta details footer */}
            <div className="p-5 space-y-3 bg-slate-900">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-indigo-400" />
                    {selectedFaceImage.userName}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedFaceImage.userEmail}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase">
                  <ShieldCheck className="h-3 w-3" />
                  Login Photo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Captured Timestamp</span>
                  <div className="flex items-center gap-1 text-slate-300 mt-1 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{selectedFaceImage.time}</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Network Node IP</span>
                  <div className="flex items-center gap-1 text-slate-300 mt-1 font-mono">
                    <Globe className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{selectedFaceImage.ip}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
