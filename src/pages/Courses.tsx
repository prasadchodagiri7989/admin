import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminCourse } from '@/api/admin';
import { Plus, Pencil, Trash2, Settings, X, Loader2, Upload } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

type CourseFormData = { title: string; description: string; thumbnail: string; isSample: boolean; batches: string[] };

function CourseModal({
  course, onClose,
}: {
  course: AdminCourse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: batches = [] } = useQuery({
    queryKey: ['admin-batches'],
    queryFn: adminApi.getBatches,
  });
  const [form, setForm] = useState<CourseFormData>({
    title:       course?.title       ?? '',
    description: course?.description ?? '',
    thumbnail:   course?.thumbnail   ?? '',
    isSample:    course?.isSample    ?? false,
    batches:     course?.batches     ?? [],
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL;
  const BACKEND_URL = API_BASE ? API_BASE.replace('/api', '') : 'http://localhost:5000';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const { thumbnailUrl } = await adminApi.uploadThumbnail(base64);
        setForm((f) => ({ ...f, thumbnail: thumbnailUrl }));
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const createMut = useMutation({
    mutationFn: (data: CourseFormData) => adminApi.createCourse(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (data: CourseFormData) => adminApi.updateCourse(course!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); onClose(); },
  });

  const mut = course ? updateMut : createMut;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    mut.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{course ? 'Edit Course' : 'New Course'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Course title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Short description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Thumbnail</label>
            <div className="mt-1 flex items-center gap-4">
              {form.thumbnail && (
                <img
                  src={form.thumbnail.startsWith('http') ? form.thumbnail : `${BACKEND_URL}${form.thumbnail}`}
                  alt="Preview"
                  className="h-16 w-24 object-cover rounded-lg border border-gray-200 bg-gray-50"
                />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </label>
                {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-400">Or enter an image URL manually</span>
              <input
                value={form.thumbnail}
                onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://…"
              />
            </div>
          </div>
          
          {/* Is Sample Course Checkbox */}
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="isSample"
              checked={form.isSample}
              onChange={(e) => setForm((f) => ({ ...f, isSample: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="isSample" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Mark as Sample Course (visible to pending approval users)
            </label>
          </div>

          {/* Batches Dropdown Checklist */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Batches (Visibility)</label>
            <div className="border border-gray-300 rounded-lg p-3 bg-white space-y-2 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 select-none">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = batches.map(b => b.id);
                    const areAllSelected = form.batches.length === batches.length;
                    setForm(f => ({ ...f, batches: areAllSelected ? [] : allIds }));
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none"
                >
                  {form.batches.length === batches.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs text-gray-500">{form.batches.length} selected</span>
              </div>
              {batches.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No batches created yet. Go to Batches module first.</p>
              ) : (
                batches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.batches.includes(b.id)}
                      onChange={() => {
                        setForm(f => {
                          const exists = f.batches.includes(b.id);
                          const next = exists
                            ? f.batches.filter(id => id !== b.id)
                            : [...f.batches, b.id];
                          return { ...f, batches: next };
                        });
                      }}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {b.name}
                  </label>
                ))
              )}
            </div>
          </div>

          {mut.error && (
            <p className="text-sm text-red-600">{(mut.error as Error).message}</p>
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
              disabled={mut.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {course ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Courses() {
  const qc = useQueryClient();
  const [modal,    setModal]    = useState<'create' | AdminCourse | null>(null);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: adminApi.getCourses,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteCourse(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); setDeleting(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Courses</h1>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Course
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Modules</th>
                  <th className="px-4 py-3 text-left">Topics</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{c.title}</p>
                      {c.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{c.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.moduleCount}</td>
                    <td className="px-4 py-3 text-gray-600">{c.topicCount}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/courses/${c.id}/manage`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Manage content"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setModal(c)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit course info"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete course"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No courses yet. Create one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal !== null && (
        <CourseModal
          course={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Delete Course</h2>
            <p className="text-sm text-gray-500 mb-5">
              Delete <strong>{deleting.title}</strong>? This also removes all user progress for this course.
            </p>
            {deleteMut.error && (
              <p className="mb-3 text-sm text-red-600">{(deleteMut.error as Error).message}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
