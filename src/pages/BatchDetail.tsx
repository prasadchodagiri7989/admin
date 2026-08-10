import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUser } from '@/api/admin';
import {
  ArrowLeft, Users, BookOpen, Settings as SettingsIcon,
  Plus, Trash2, Pencil, Search, X, Loader2, Check
} from 'lucide-react';

function AddMemberModal({
  currentMembers,
  onAdd,
  onClose,
}: {
  currentMembers: string[];
  onAdd: (userId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
  });

  const availableStudents = users.filter(
    (u) => u.role === 'student' && !currentMembers.includes(u.id)
  );

  const filtered = availableStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="font-semibold text-gray-900">Add Batch Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search students by name or email..."
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="text-center py-6 text-sm text-gray-400">Loading students...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">No students available.</div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                <button
                  onClick={() => onAdd(s.id)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// User Edit Modal (simplified copy from Users.tsx to support modify users inside batch)
function EditUserModal({
  user,
  onClose,
}: {
  user: { id: string; name: string; email: string; status: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(user.status);

  const updateMut = useMutation({
    mutationFn: (data: { name: string; email: string; status: string }) =>
      adminApi.updateUser(user.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batch'] });
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    updateMut.mutate({ name, email, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Modify User Info</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active</option>
              <option value="pending">Pending Approval</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          {updateMut.error && (
            <p className="text-xs text-red-600">{(updateMut.error as Error).message}</p>
          )}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'members' | 'courses' | 'settings'>('members');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; status: string } | null>(null);

  // Fetch Batch Details
  const { data: batch, isLoading } = useQuery({
    queryKey: ['admin-batch', id],
    queryFn: () => adminApi.getBatchById(id!),
    enabled: !!id,
  });

  // Fetch All Courses (for Course Alignment tab)
  const { data: allCourses = [] } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: adminApi.getCourses,
  });

  // Local state for Course selection Alignment
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [initializedCourses, setInitializedCourses] = useState(false);

  if (batch && !initializedCourses) {
    setSelectedCourses(batch.courses.map((c) => c.id));
    setInitializedCourses(true);
  }

  // Mutations
  const addMemberMut = useMutation({
    mutationFn: (userId: string) => adminApi.addBatchMember(id!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batch', id] });
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (userId: string) => adminApi.removeBatchMember(id!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batch', id] });
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
    },
  });

  const alignCoursesMut = useMutation({
    mutationFn: (courseIds: string[]) => adminApi.alignBatchCourses(id!, courseIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batch', id] });
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      alert('Courses aligned successfully!');
    },
  });

  const updateBatchMut = useMutation({
    mutationFn: (data: { name: string; description: string }) => adminApi.updateBatch(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batch', id] });
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      alert('Batch settings updated successfully!');
    },
  });

  const [reorderingCourse, setReorderingCourse] = useState<any | null>(null);
  const [orderedModuleIds, setOrderedModuleIds] = useState<string[]>([]);

  const openReorderModal = (course: any) => {
    setReorderingCourse(course);
    const batchOrder = batch?.moduleOrder?.find((mo: any) => mo.courseId === course.id);
    if (batchOrder && batchOrder.moduleIds && batchOrder.moduleIds.length > 0) {
      const orderMap = new Map(batchOrder.moduleIds.map((mid: string, idx: number) => [mid, idx]));
      const sorted = [...course.modules].sort((a, b) => {
        const aIdx = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const bIdx = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        return aIdx - bIdx;
      });
      setOrderedModuleIds(sorted.map(m => m.id));
    } else {
      setOrderedModuleIds((course.modules || []).map((m: any) => m.id));
    }
  };

  const reorderBatchModulesMut = useMutation({
    mutationFn: ({ courseId, moduleIds }: { courseId: string; moduleIds: string[] }) =>
      adminApi.reorderBatchModules(id!, courseId, moduleIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batch', id] });
      setReorderingCourse(null);
      alert('Module sequence updated successfully for this batch!');
    },
  });

  // Settings form local state
  const [batchName, setBatchName] = useState('');
  const [batchDesc, setBatchDesc] = useState('');
  const [initializedSettings, setInitializedSettings] = useState(false);

  if (batch && !initializedSettings) {
    setBatchName(batch.name);
    setBatchDesc(batch.description);
    setInitializedSettings(true);
  }

  if (isLoading || !batch) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" /> Loading batch details…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          to="/batches"
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{batch.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{batch.description || 'No description'}</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-sm p-1 select-none">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'members'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Users className="h-4 w-4" />
          Members ({batch.members?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'courses'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Courses ({batch.courses?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'settings'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        
        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Batch Members</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Student
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batch.members?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-sm text-gray-400 italic">
                        No students enrolled in this batch yet.
                      </td>
                    </tr>
                  ) : (
                    batch.members.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/30">
                        <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                        <td className="px-4 py-3 text-gray-500">{m.email}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : m.status === 'blocked'
                              ? 'bg-red-50 text-red-700 border-red-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <button
                              onClick={() => setEditingUser(m)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Modify student details"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeMemberMut.mutate(m.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove student from batch"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Align Courses for Batch</h2>
                <p className="text-xs text-gray-400 mt-0.5">Select courses allowed for this batch. Click "Save Alignments" when done.</p>
              </div>
              <button
                onClick={() => alignCoursesMut.mutate(selectedCourses)}
                disabled={alignCoursesMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {alignCoursesMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Alignments
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {allCourses.map((c) => {
                const isSelected = selectedCourses.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCourses((prev) =>
                        prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                      );
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all select-none ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">{c.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{c.description || 'No description'}</p>
                      
                      {isSelected && c.modules && c.modules.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReorderModal(c);
                          }}
                          className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 rounded-md shadow-sm transition-colors cursor-pointer"
                        >
                          Customize Module Order ({c.modules.length})
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[11px] text-gray-400">{c.moduleCount} modules · {c.topicCount} topics</span>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (batchName.trim()) {
                updateBatchMut.mutate({ name: batchName.trim(), description: batchDesc });
              }
            }}
            className="space-y-4 max-w-md"
          >
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Batch Settings</h2>
              <p className="text-xs text-gray-400 mb-4">Edit name and details about this learning group.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
              <input
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={batchDesc}
                onChange={(e) => setBatchDesc(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={updateBatchMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {updateBatchMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Settings
            </button>
          </form>
        )}

      </div>

      {/* Add member modal */}
      {showAddModal && (
        <AddMemberModal
          currentMembers={batch.members?.map((m) => m.id) || []}
          onAdd={(userId) => {
            addMemberMut.mutate(userId);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit user details modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* Reorder Modules Modal Overlay */}
      {reorderingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Custom Module Sequence</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Customize module ordering specifically for <strong>{batch.name}</strong>.</p>
              </div>
              <button onClick={() => setReorderingCourse(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 my-4 max-h-[50vh] overflow-y-auto pr-1">
              {orderedModuleIds.map((mid, idx) => {
                const modObj = reorderingCourse.modules?.find((m: any) => m.id === mid);
                if (!modObj) return null;
                return (
                  <div key={mid} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-xs">{modObj.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...orderedModuleIds];
                          const temp = list[idx];
                          list[idx] = list[idx - 1];
                          list[idx - 1] = temp;
                          setOrderedModuleIds(list);
                        }}
                        disabled={idx === 0}
                        className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...orderedModuleIds];
                          const temp = list[idx];
                          list[idx] = list[idx + 1];
                          list[idx + 1] = temp;
                          setOrderedModuleIds(list);
                        }}
                        disabled={idx === orderedModuleIds.length - 1}
                        className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {reorderBatchModulesMut.error && (
              <p className="text-xs text-red-600 mb-3">{(reorderBatchModulesMut.error as Error).message}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setReorderingCourse(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => reorderBatchModulesMut.mutate({ courseId: reorderingCourse.id, moduleIds: orderedModuleIds })}
                disabled={reorderBatchModulesMut.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {reorderBatchModulesMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Sequence
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
