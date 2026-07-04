import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Globe,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Camera,
  Eye,
  Calendar,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

interface Filters {
  search:        string;
  method:        'all' | 'google' | 'email';
  captureStatus: 'all' | 'captured' | 'missing';
  dateFrom:      string;
  dateTo:        string;
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  method: 'all',
  captureStatus: 'all',
  dateFrom: '',
  dateTo: '',
};

const API_BASE = import.meta.env.VITE_API_URL as string;
const BACKEND_URL = API_BASE ? API_BASE.replace('/api', '') : 'http://localhost:5000';

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function DeviceIcon({ ua }: { ua: string | null }) {
  if (!ua) return <Globe className="h-3.5 w-3.5 text-slate-400" />;
  const u = ua.toLowerCase();
  if (u.includes('mobile') || u.includes('android') || u.includes('iphone'))
    return <Smartphone className="h-3.5 w-3.5 text-indigo-400" />;
  return <Monitor className="h-3.5 w-3.5 text-slate-500" />;
}

export default function LoginSessions() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    userName: string;
    userEmail: string;
    time: string;
    ip: string;
  } | null>(null);

  const LIMIT = 50;

  // Query activity logs from admin API
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-activity-sessions', page],
    queryFn: () => adminApi.getActivity(page, LIMIT),
  });

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'search' && v !== DEFAULT_FILTERS[k as keyof Filters]
  ).length;

  const filtered = useMemo(() => {
    const records = data?.data ?? [];
    const q = filters.search.toLowerCase();
    
    return records.filter((a) => {
      // 1. Search filter
      if (q) {
        const name = a.user?.name?.toLowerCase() ?? '';
        const email = a.user?.email?.toLowerCase() ?? '';
        const ip = a.ip?.toLowerCase() ?? '';
        if (!name.includes(q) && !email.includes(q) && !ip.includes(q)) return false;
      }
      
      // 2. Auth Method filter
      if (filters.method !== 'all' && a.method !== filters.method) return false;
      
      // 3. Face Capture Status filter
      if (filters.captureStatus !== 'all') {
        const hasFace = !!a.faceCard;
        if (filters.captureStatus === 'captured' && !hasFace) return false;
        if (filters.captureStatus === 'missing' && hasFace) return false;
      }
      
      // 4. Date range filters
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).getTime();
        if (new Date(a.createdAt).getTime() < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo).getTime() + 86400000;
        if (new Date(a.createdAt).getTime() > to) return false;
      }
      
      return true;
    });
  }, [data, filters]);

  // Statistics counters based on current page data
  const stats = useMemo(() => {
    const records = data?.data ?? [];
    const total = records.length;
    const captured = records.filter(r => !!r.faceCard).length;
    return {
      total,
      captured,
      missing: total - captured,
      ratio: total > 0 ? Math.round((captured / total) * 100) : 0
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="h-6 w-6 text-indigo-600" />
            Face Capture Sessions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit and verify user face identities captured on successful login sessions.
          </p>
        </div>
        
        {data && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 self-start md:self-auto">
            {filters.search || activeFilterCount > 0
              ? `${filtered.length} of ${data.total.toLocaleString()} sessions`
              : `${data.total.toLocaleString()} total sessions`}
          </span>
        )}
      </div>

      {/* Stats Counter Widget Grid */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Analysed</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-500">Captured Face Cards</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.captured}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Missing Captures</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{stats.missing}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Verification Rate</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">{stats.ratio}%</p>
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search by name, email or IP…"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={clsx(
            'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all shadow-sm',
            showFilters ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {(activeFilterCount > 0 || filters.search) && (
          <button
            onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Expanded filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-sm animate-fade-in">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Auth Method</label>
            <select
              value={filters.method}
              onChange={(e) => setFilter('method', e.target.value as Filters['method'])}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All methods</option>
              <option value="google">Google</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Capture Status</label>
            <select
              value={filters.captureStatus}
              onChange={(e) => setFilter('captureStatus', e.target.value as Filters['captureStatus'])}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All Statuses</option>
              <option value="captured">Verified Face Card</option>
              <option value="missing">Missing Face Card</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Date from</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Date to</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
      )}

      {/* Main Table Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-300 mr-2" />
            Loading login sessions…
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">User</th>
                    <th className="px-5 py-3 text-center">Face Identity Card</th>
                    <th className="px-5 py-3 text-left">IP Address</th>
                    <th className="px-5 py-3 text-center">Method</th>
                    <th className="px-5 py-3 text-center">Device</th>
                    <th className="px-5 py-3 text-left">User Agent</th>
                    <th className="px-5 py-3 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((a) => {
                    const hasFaceImage = !!a.faceCard;
                    const imageUrl = hasFaceImage ? `${BACKEND_URL}${a.faceCard}` : '';

                    return (
                      <tr key={String(a.id)} className="hover:bg-slate-50 transition-colors">
                        {/* User Details */}
                        <td className="px-5 py-4">
                          {a.user ? (
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                                {a.user.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 leading-none">{a.user.name}</p>
                                <p className="text-xs text-slate-400 mt-1">{a.user.email}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-xs">Deleted user</p>
                          )}
                        </td>

                        {/* Face Card Thumbnail / Status */}
                        <td className="px-5 py-4 text-center">
                          {hasFaceImage ? (
                            <div className="inline-block group relative cursor-pointer" onClick={() => setSelectedImage({
                              url: imageUrl,
                              userName: a.user?.name ?? 'Deleted User',
                              userEmail: a.user?.email ?? '',
                              time: fmtDate(a.createdAt),
                              ip: a.ip
                            })}>
                              <div className="h-10 w-12 rounded-lg border border-slate-200 overflow-hidden relative shadow-sm group-hover:border-indigo-500 transition-colors">
                                <img
                                  src={imageUrl}
                                  alt="Face captured"
                                  className="h-full w-full object-cover transform scale-100 group-hover:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              Missing
                            </span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">{a.ip}</td>

                        {/* Method */}
                        <td className="px-5 py-4 text-center">
                          <span className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            a.method === 'google' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                          )}>
                            {a.method === 'google' ? 'Google' : 'Email'}
                          </span>
                        </td>

                        {/* Device Icon */}
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center p-1.5 bg-slate-100 rounded-md">
                            <DeviceIcon ua={a.userAgent} />
                          </span>
                        </td>

                        {/* User Agent */}
                        <td className="px-5 py-4 text-xs text-slate-400 max-w-xs truncate">
                          {a.userAgent ?? '—'}
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {fmtDate(a.createdAt)}
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center text-slate-400 text-sm">
                        <Camera className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                        {(data?.data.length ?? 0) === 0
                          ? 'No login sessions found.'
                          : 'No login sessions match the selected filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Page <span className="font-semibold text-slate-700">{data.page}</span> of <span className="font-semibold text-slate-700">{data.pages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Beautiful Face Card Lightbox Modal Popup */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white relative animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-md"
              aria-label="Close modal"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Modal Image Viewport */}
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800 shadow-inner">
              <img
                src={selectedImage.url}
                alt="Face card full view"
                className="w-full h-full object-contain"
              />

              {/* Scanning visual indicators overlay */}
              <div className="absolute inset-0 pointer-events-none border-[16px] border-slate-950/20">
                <div className="w-full h-full border border-indigo-500/20 relative">
                  <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-indigo-400/80" />
                  <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-indigo-400/80" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-indigo-400/80" />
                  <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-indigo-400/80" />
                </div>
              </div>
            </div>

            {/* Meta details footer info */}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-800/50 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                    <UserCheck className="h-5 w-5 text-indigo-400" />
                    {selectedImage.userName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{selectedImage.userEmail}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Session
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/30">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Captured Timestamp</span>
                  <div className="flex items-center gap-1 text-slate-300 mt-1 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{selectedImage.time}</span>
                  </div>
                </div>
                <div className="space-y-1 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/30">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Network Node IP</span>
                  <div className="flex items-center gap-1 text-slate-300 mt-1 font-mono">
                    <Globe className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{selectedImage.ip}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
