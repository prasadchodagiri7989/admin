import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { ChevronLeft, ChevronRight, Monitor, Smartphone, Globe, Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

interface Filters {
  search:     string;
  method:     'all' | 'google' | 'email';
  dateFrom:   string;
  dateTo:     string;
}

const DEFAULT_FILTERS: Filters = { search: '', method: 'all', dateFrom: '', dateTo: '' };

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DeviceIcon({ ua }: { ua: string | null }) {
  if (!ua) return <Globe className="h-3.5 w-3.5 text-gray-400" />;
  const u = ua.toLowerCase();
  if (u.includes('mobile') || u.includes('android') || u.includes('iphone'))
    return <Smartphone className="h-3.5 w-3.5 text-blue-400" />;
  return <Monitor className="h-3.5 w-3.5 text-gray-500" />;
}

export default function Activity() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const LIMIT = 50;

  // Fetch all pages' worth â€” we filter client-side since backend returns paginated data
  // We load page=1 and apply local filters; reset to page 1 on filter change
  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity', page],
    queryFn: () => adminApi.getActivity(page, LIMIT),
  });

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k !== 'search' && v !== DEFAULT_FILTERS[k as keyof Filters]
  ).length;

  const filtered = useMemo(() => {
    const records = data?.data ?? [];
    const q = filters.search.toLowerCase();
    return records.filter(a => {
      if (q) {
        const name  = a.user?.name?.toLowerCase() ?? '';
        const email = a.user?.email?.toLowerCase() ?? '';
        const ip    = a.ip?.toLowerCase() ?? '';
        if (!name.includes(q) && !email.includes(q) && !ip.includes(q)) return false;
      }
      if (filters.method !== 'all' && a.method !== filters.method) return false;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Login Activity</h1>
        {data && (
          <span className="text-sm text-gray-500">
            {filters.search || activeFilterCount > 0
              ? `${filtered.length} of ${data.total.toLocaleString()} events`
              : `${data.total.toLocaleString()} total events`}
          </span>
        )}
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search by name, email or IPâ€¦"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {filters.search && (
            <button onClick={() => setFilter('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={clsx(
            'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            showFilters ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>

        {(activeFilterCount > 0 || filters.search) && (
          <button
            onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Auth Method</label>
            <select
              value={filters.method}
              onChange={(e) => setFilter('method', e.target.value as Filters['method'])}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All methods</option>
              <option value="google">Google</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date from</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date to</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo', e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loadingâ€¦</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">IP Address</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Device</th>
                    <th className="px-4 py-3 text-left">User Agent</th>
                    <th className="px-4 py-3 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((a) => (
                    <tr key={String(a.id)} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {a.user ? (
                          <>
                            <p className="font-medium text-gray-800">{a.user.name}</p>
                            <p className="text-xs text-gray-400">{a.user.email}</p>
                          </>
                        ) : (
                          <p className="text-gray-400 italic text-xs">Deleted user</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.ip}</td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          a.method === 'google' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {a.method === 'google' ? 'Google' : 'Email'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><DeviceIcon ua={a.userAgent} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                        {a.userAgent ?? 'â€”'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(a.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                        {(data?.data.length ?? 0) === 0
                          ? 'No login activity yet.'
                          : 'No records match the current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Page {data.page} of {data.pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}