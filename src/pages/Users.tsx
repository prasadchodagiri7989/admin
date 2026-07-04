import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUser } from '@/api/admin';
import {
  Search, Pencil, Trash2, X, Loader2, ShieldCheck, User2, Chrome,
  ChevronUp, ChevronDown, RotateCcw, SlidersHorizontal,
  Upload, Download, CheckCircle2, AlertCircle, FileText,
} from 'lucide-react';
import clsx from 'clsx';

type SortField = 'name' | 'loginCount' | 'lastLogin' | 'createdAt';
type SortDir   = 'asc' | 'desc';

interface Filters {
  search:     string;
  role:       'all' | 'admin' | 'student';
  status:     'all' | 'active' | 'blocked';
  authMethod: 'all' | 'google' | 'email';
  joinedFrom: string;
  joinedTo:   string;
}

const DEFAULT_FILTERS: Filters = {
  search: '', role: 'all', status: 'all', authMethod: 'all', joinedFrom: '', joinedTo: '',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
    )}>
      {role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <User2 className="h-3 w-3" />}
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'blocked' }) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
    )}>
      {status === 'active' ? '● Active' : '✕ Blocked'}
    </span>
  );
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronUp className="h-3 w-3 text-gray-300" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-indigo-500" />
    : <ChevronDown className="h-3 w-3 text-indigo-500" />;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function downloadTemplate() {
  const csv = 'name,email,role,password\nJohn Doe,john@example.com,student,\nJane Smith,jane@example.com,admin,Secret123';
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'users_import_template.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

interface CsvRow { name: string; email: string; role: string; password: string }

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx     = headers.indexOf('name');
  const emailIdx    = headers.indexOf('email');
  const roleIdx     = headers.indexOf('role');
  const passwordIdx = headers.indexOf('password');
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    return {
      name:     nameIdx     >= 0 ? cols[nameIdx]     ?? '' : '',
      email:    emailIdx    >= 0 ? cols[emailIdx]    ?? '' : '',
      role:     roleIdx     >= 0 ? cols[roleIdx]     ?? '' : '',
      password: passwordIdx >= 0 ? cols[passwordIdx] ?? '' : '',
    };
  }).filter(r => r.name || r.email);
}

interface ImportResult {
  message: string;
  created: number;
  skipped: number;
  errors: { email: string; reason: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Users() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // filters / sort
  const [filters, setFilters]     = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort]           = useState<{ field: SortField; dir: SortDir }>({ field: 'createdAt', dir: 'desc' });

  // edit modal
  const [editing,    setEditing]    = useState<AdminUser | null>(null);
  const [editName,   setEditName]   = useState('');
  const [editEmail,  setEditEmail]  = useState('');
  const [editRole,   setEditRole]   = useState('');
  const [editStatus, setEditStatus] = useState('');

  // delete modal
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  // csv import modal
  const [showImport, setShowImport] = useState(false);
  const [csvRows,    setCsvRows]    = useState<CsvRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; email?: string; role?: string; status?: string } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleting(null);
    },
  });

  const bulkMut = useMutation({
    mutationFn: (rows: CsvRow[]) => adminApi.bulkCreateUsers(rows),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setImportResult(result);
      setCsvRows([]);
    },
  });

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters(f => ({ ...f, [key]: val }));

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k !== 'search' && v !== DEFAULT_FILTERS[k as keyof Filters]
  ).length;

  const toggleSort = (field: SortField) => {
    setSort(s => s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    );
  };

  const filtered = useMemo(() => {
    let list = [...users];
    const q = filters.search.toLowerCase();
    if (q) list = list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
    if (filters.role !== 'all')          list = list.filter(u => u.role === filters.role);
    if (filters.status !== 'all')        list = list.filter(u => (u.status || 'active') === filters.status);
    if (filters.authMethod === 'google') list = list.filter(u => u.hasGoogle);
    if (filters.authMethod === 'email')  list = list.filter(u => !u.hasGoogle);
    if (filters.joinedFrom) {
      const from = new Date(filters.joinedFrom).getTime();
      list = list.filter(u => new Date(u.createdAt).getTime() >= from);
    }
    if (filters.joinedTo) {
      const to = new Date(filters.joinedTo).getTime() + 86400000;
      list = list.filter(u => new Date(u.createdAt).getTime() <= to);
    }
    list.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sort.field === 'name')       { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      if (sort.field === 'loginCount') { av = a.loginCount; bv = b.loginCount; }
      if (sort.field === 'lastLogin')  { av = a.lastLogin ?? ''; bv = b.lastLogin ?? ''; }
      if (sort.field === 'createdAt')  { av = a.createdAt; bv = b.createdAt; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, filters, sort]);

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditStatus(u.status || 'active');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setCsvRows(rows);
      setImportResult(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openImport = () => {
    setCsvRows([]);
    setImportResult(null);
    setShowImport(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filtered.length} of {users.length}</span>
          <button
            onClick={openImport}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
        </div>
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search by name or email…"
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
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilter('role', e.target.value as Filters['role'])}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value as Filters['status'])}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Auth Method</label>
            <select
              value={filters.authMethod}
              onChange={(e) => setFilter('authMethod', e.target.value as Filters['authMethod'])}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All methods</option>
              <option value="google">Google only</option>
              <option value="email">Email only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Joined from</label>
            <input
              type="date"
              value={filters.joinedFrom}
              onChange={(e) => setFilter('joinedFrom', e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Joined to</label>
            <input
              type="date"
              value={filters.joinedTo}
              onChange={(e) => setFilter('joinedTo', e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                      User <SortIcon field="name" sort={sort} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('loginCount')} className="flex items-center gap-1 hover:text-gray-700">
                      Logins <SortIcon field="loginCount" sort={sort} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Last IP</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('lastLogin')} className="flex items-center gap-1 hover:text-gray-700">
                      Last Login <SortIcon field="lastLogin" sort={sort} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-gray-700">
                      Joined <SortIcon field="createdAt" sort={sort} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Auth</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={u.status || 'active'} /></td>
                    <td className="px-4 py-3 text-gray-600">{u.loginCount}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.lastIp ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.lastLogin)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.hasGoogle && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                          <Chrome className="h-3 w-3" /> Google
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                      {users.length === 0 ? 'No users yet.' : 'No users match the current filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Edit User</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>
            {updateMut.error && (
              <p className="mt-3 text-sm text-red-600">{(updateMut.error as Error).message}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMut.mutate({
                  id: editing.id,
                  data: { name: editName, email: editEmail, role: editRole, status: editStatus },
                })}
                disabled={updateMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ───────────────────────────────────────────────── */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Delete User</h2>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete <strong>{deleting.name}</strong>? This also deletes their login history and progress.
            </p>
            {deleteMut.error && (
              <p className="mb-3 text-sm text-red-600">{(deleteMut.error as Error).message}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(deleting.id)}
                disabled={deleteMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ───────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Bulk Import Users</h2>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1: template download */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Step 1 — Download the CSV template</p>
              <p className="text-xs text-gray-500 mb-3">
                Fill in <strong>name</strong> and <strong>email</strong> (required). <strong>role</strong> defaults to student.
                <strong> password</strong> is optional — leave blank for Google-only accounts.
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
              >
                <Download className="h-4 w-4" /> Download Template
              </button>
            </div>

            {/* Step 2: upload */}
            <div className="rounded-xl border border-dashed border-gray-300 p-4 mb-4 text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">Step 2 — Upload your filled CSV</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 mx-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <FileText className="h-4 w-4" /> Choose CSV File
              </button>
            </div>

            {/* Preview */}
            {csvRows.length > 0 && !importResult && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">{csvRows.length} rows ready to import</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left text-gray-500">Email</th>
                        <th className="px-3 py-2 text-left text-gray-500">Role</th>
                        <th className="px-3 py-2 text-left text-gray-500">Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvRows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-700">{r.name || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-1.5 text-gray-700">{r.email || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-1.5 text-gray-500">{r.role || 'student'}</td>
                          <td className="px-3 py-1.5 text-gray-400">{r.password ? '••••••' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className={clsx(
                'rounded-xl border p-4 mb-4',
                importResult.skipped > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.skipped > 0
                    ? <AlertCircle className="h-4 w-4 text-amber-500" />
                    : <CheckCircle2 className="h-4 w-4 text-green-500" />
                  }
                  <p className="text-sm font-medium text-gray-800">{importResult.message}</p>
                </div>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
                    {importResult.errors.map((e, i) => (
                      <li key={i}><span className="font-medium">{e.email}</span> — {e.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {bulkMut.error && (
              <p className="mb-3 text-sm text-red-600">{(bulkMut.error as Error).message}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowImport(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {csvRows.length > 0 && !importResult && (
                <button
                  onClick={() => bulkMut.mutate(csvRows)}
                  disabled={bulkMut.isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {bulkMut.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                    : <><Upload className="h-4 w-4" /> Import {csvRows.length} Users</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
