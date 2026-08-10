import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminBatch } from '@/api/admin';
import { Plus, Trash2, Settings, X, Loader2, Info } from 'lucide-react';

function BatchModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '' });

  const createMut = useMutation({
    mutationFn: (data: { name: string; description: string }) => adminApi.createBatch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMut.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">New Batch</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Batch A, Morning Session"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Short details about the batch"
            />
          </div>
          {createMut.error && (
            <p className="text-sm text-red-600">{(createMut.error as Error).message}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Batches() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<AdminBatch | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['admin-batches'],
    queryFn: adminApi.getBatches,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteBatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      setDeleting(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Batches</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage learning groups, assign user membership, and align course materials.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Batch
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" /> Loading batches…
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm space-y-2">
            <Info className="h-8 w-8 text-gray-300" />
            <p>No batches created yet. Click "New Batch" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 text-left">Batch Name</th>
                  <th className="px-6 py-4 text-left">Description</th>
                  <th className="px-6 py-4 text-center">Members</th>
                  <th className="px-6 py-4 text-center">Aligned Courses</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{b.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-500 truncate max-w-xs">{b.description || 'No description'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {b.members?.length || 0} students
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {b.courses?.length || 0} courses
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/batches/${b.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                          title="Manage members & courses"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Manage
                        </Link>
                        <button
                          onClick={() => setDeleting(b)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Batch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <BatchModal onClose={() => setShowCreate(false)} />}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Delete Batch</h2>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete the batch <strong>{deleting.name}</strong>? This does not delete the users themselves, but removes their batch associations.
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
    </div>
  );
}
