import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminCourse, type AdminModule } from '@/api/admin';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Loader2, Video,
  FileText, Save, Eye, Code, ArrowUp, ArrowDown, Copy, FolderInput, Pencil, X
} from 'lucide-react';
import clsx from 'clsx';

function NotesEditor({
  courseId, moduleId, topicId, initialNotes, topicTitle, onClose,
}: {
  courseId: string; moduleId: string; topicId: string;
  initialNotes: string; topicTitle: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [html, setHtml] = useState(initialNotes);
  const [preview, setPreview] = useState(false);

  const mut = useMutation({
    mutationFn: () => adminApi.updateTopicNotes(courseId, moduleId, topicId, html),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Edit Lesson Notes</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{topicTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview((v) => !v)}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                preview
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {preview ? <Code className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {preview ? 'Edit HTML' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Notes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {preview ? (
            <div className="flex-1 overflow-y-auto p-6">
              {html ? (
                <div
                  className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-blockquote:border-indigo-400"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <p className="text-gray-400 text-sm italic">Nothing to preview — add some HTML above.</p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 gap-2 overflow-hidden">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Code className="h-3.5 w-3.5" />
                Write HTML — use tags like &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;strong&gt;, &lt;blockquote&gt;
              </div>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                spellCheck={false}
                className="flex-1 rounded-lg border border-gray-200 p-3 font-mono text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                placeholder="<h2>Lesson Title</h2>&#10;<p>Your notes here</p>"
              />
            </div>
          )}
        </div>

        {mut.error && (
          <div className="px-5 py-2 border-t border-gray-100 text-xs text-red-600 shrink-0">
            {(mut.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CourseManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: adminApi.getCourses,
  });

  const course: AdminCourse | undefined = courses.find((c) => c.id === id);
  const otherCourses = courses.filter((c) => c.id !== id);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (mid: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(mid) ? n.delete(mid) : n.add(mid);
      return n;
    });

  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<{
    moduleId: string; topicId: string; title: string; notes: string;
  } | null>(null);

  // New modules / topic values
  const [newModTitle, setNewModTitle] = useState('');
  const [topicForms, setTopicForms] = useState<Record<string, { title: string; videoId: string; videoType?: string; bunnyLibraryId?: string; attachmentFile?: string; attachmentName?: string }>>({});

  // Course title inline editing state
  const [isEditingCourseTitle, setIsEditingCourseTitle] = useState(false);
  const [courseTitleInput, setCourseTitleInput] = useState('');

  // Module rename inline editing state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');

  // Duplicate / copy modules state
  const [copyingModule, setCopyingModule] = useState<{ id: string; title: string } | null>(null);
  const [targetCourseId, setTargetCourseId] = useState<string>('');

  // Topic detail editing state (Title, Video ID, Fallback URL)
  const [editingTopic, setEditingTopic] = useState<{
    moduleId: string; id: string; title: string; videoId: string; videoUrl: string; videoType?: string; bunnyLibraryId?: string; attachments?: { id: string; name: string; url: string }[];
  } | null>(null);

  const refetch = () => qc.invalidateQueries({ queryKey: ['admin-courses'] });

  // Standard course mutations
  const updateCourseTitleMut = useMutation({
    mutationFn: (title: string) => adminApi.updateCourse(id!, { title }),
    onSuccess: refetch,
  });

  // Module operations mutations
  const addModMut = useMutation({
    mutationFn: (title: string) => adminApi.addModule(id!, title),
    onSuccess: () => { refetch(); setNewModTitle(''); },
  });

  const delModMut = useMutation({
    mutationFn: (moduleId: string) => adminApi.deleteModule(id!, moduleId),
    onSuccess: refetch,
  });

  const updateModuleMut = useMutation({
    mutationFn: ({ moduleId, title }: { moduleId: string; title: string }) =>
      adminApi.updateModule(id!, moduleId, title),
    onSuccess: refetch,
  });

  const duplicateModuleMut = useMutation({
    mutationFn: (moduleId: string) => adminApi.duplicateModule(id!, moduleId),
    onSuccess: refetch,
  });

  const copyModuleMut = useMutation({
    mutationFn: ({ moduleId, targetCourseId }: { moduleId: string; targetCourseId: string }) =>
      adminApi.copyModuleToCourse(id!, moduleId, targetCourseId),
    onSuccess: () => {
      refetch();
      setCopyingModule(null);
      setTargetCourseId('');
    },
  });

  const reorderModulesMut = useMutation({
    mutationFn: (moduleIds: string[]) => adminApi.reorderModules(id!, moduleIds),
    onSuccess: refetch,
  });

  // Topic operations mutations
  const addTopicMut = useMutation({
    mutationFn: ({ moduleId, title, videoId, videoUrl, videoType, bunnyLibraryId, attachmentFile, attachmentName }: { moduleId: string; title: string; videoId?: string; videoUrl?: string; videoType?: string; bunnyLibraryId?: string; attachmentFile?: string; attachmentName?: string }) =>
      adminApi.addTopic(id!, moduleId, { title, videoId: videoId || undefined, videoUrl: videoUrl || undefined, videoType, bunnyLibraryId: bunnyLibraryId || undefined, attachmentFile, attachmentName }),
    onSuccess: (_data, vars) => {
      refetch();
      setTopicForms((f) => ({ ...f, [vars.moduleId]: { title: '', videoId: '', videoType: 'bunny', bunnyLibraryId: '', attachmentFile: '', attachmentName: '' } }));
    },
  });

  const delTopicMut = useMutation({
    mutationFn: ({ moduleId, topicId }: { moduleId: string; topicId: string }) =>
      adminApi.deleteTopic(id!, moduleId, topicId),
    onSuccess: refetch,
  });

  const updateTopicMut = useMutation({
    mutationFn: ({ moduleId, topicId, data }: { moduleId: string; topicId: string; data: { title?: string; videoId?: string; videoUrl?: string; videoType?: string; bunnyLibraryId?: string } }) =>
      adminApi.updateTopic(id!, moduleId, topicId, data),
    onSuccess: () => {
      refetch();
      setEditingTopic(null);
    },
  });

  const reorderTopicsMut = useMutation({
    mutationFn: ({ moduleId, topicIds }: { moduleId: string; topicIds: string[] }) =>
      adminApi.reorderTopics(id!, moduleId, topicIds),
    onSuccess: refetch,
  });

  const [renamingAttachmentId, setRenamingAttachmentId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const addAttachmentMut = useMutation({
    mutationFn: ({ name, file }: { name: string; file: string }) =>
      adminApi.addAttachment(id!, editingTopic!.moduleId, editingTopic!.id, name, file),
    onSuccess: (updatedCourse) => {
      refetch();
      if (editingTopic) {
        const mod = updatedCourse.modules.find(m => m.id === editingTopic.moduleId);
        const top = mod?.topics.find(t => t.id === editingTopic.id);
        if (top) {
          setEditingTopic(prev => prev ? { ...prev, attachments: top.attachments } : null);
        }
      }
    }
  });

  const renameAttachmentMut = useMutation({
    mutationFn: ({ attachmentId, name }: { attachmentId: string; name: string }) =>
      adminApi.renameAttachment(id!, editingTopic!.moduleId, editingTopic!.id, attachmentId, name),
    onSuccess: (updatedCourse) => {
      refetch();
      setRenamingAttachmentId(null);
      if (editingTopic) {
        const mod = updatedCourse.modules.find(m => m.id === editingTopic.moduleId);
        const top = mod?.topics.find(t => t.id === editingTopic.id);
        if (top) {
          setEditingTopic(prev => prev ? { ...prev, attachments: top.attachments } : null);
        }
      }
    }
  });

  const deleteAttachmentMut = useMutation({
    mutationFn: (attachmentId: string) =>
      adminApi.deleteAttachment(id!, editingTopic!.moduleId, editingTopic!.id, attachmentId),
    onSuccess: (updatedCourse) => {
      refetch();
      if (editingTopic) {
        const mod = updatedCourse.modules.find(m => m.id === editingTopic.moduleId);
        const top = mod?.topics.find(t => t.id === editingTopic.id);
        if (top) {
          setEditingTopic(prev => prev ? { ...prev, attachments: top.attachments } : null);
        }
      }
    }
  });

  // Reorder Chevrons handlers
  const handleMoveModule = (moduleId: string, direction: 'up' | 'down') => {
    if (!course) return;
    const modulesList = [...course.modules];
    const index = modulesList.findIndex((m) => m.id === moduleId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modulesList.length) return;

    // Swap
    const temp = modulesList[index];
    modulesList[index] = modulesList[targetIndex];
    modulesList[targetIndex] = temp;

    const newModuleIds = modulesList.map((m) => m.id);
    reorderModulesMut.mutate(newModuleIds);
  };

  const handleMoveTopic = (moduleId: string, topicId: string, direction: 'up' | 'down') => {
    if (!course) return;
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const topicsList = [...mod.topics];
    const index = topicsList.findIndex((t) => t.id === topicId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= topicsList.length) return;

    // Swap
    const temp = topicsList[index];
    topicsList[index] = topicsList[targetIndex];
    topicsList[targetIndex] = temp;

    const newTopicIds = topicsList.map((t) => t.id);
    reorderTopicsMut.mutate({ moduleId, topicIds: newTopicIds });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </button>
        <p className="text-gray-500 text-sm">Course not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 max-w-3xl animate-fade-in">
        <div>
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Courses
          </button>
          
          {/* Editable Course Title */}
          {isEditingCourseTitle ? (
            <div className="flex items-center gap-2 max-w-md">
              <input
                value={courseTitleInput}
                onChange={(e) => setCourseTitleInput(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                autoFocus
              />
              <button
                onClick={() => {
                  if (courseTitleInput.trim()) {
                    updateCourseTitleMut.mutate(courseTitleInput.trim());
                    setIsEditingCourseTitle(false);
                  }
                }}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 text-xs font-semibold"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <button
                onClick={() => {
                  setIsEditingCourseTitle(false);
                  setCourseTitleInput(course.title);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
              <button
                onClick={() => {
                  setIsEditingCourseTitle(true);
                  setCourseTitleInput(course.title);
                }}
                className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                title="Edit Course Name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-0.5">
            {course.moduleCount} modules · {course.topicCount} topics
          </p>
        </div>

        {/* Modules List */}
        <div className="space-y-3">
          {(course.modules as AdminModule[]).map((mod, moduleIndex) => {
            const isOpen = expanded.has(mod.id);
            const tf = topicForms[mod.id] ?? { title: '', videoId: '' };

            return (
              <div
                key={mod.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  {editingModuleId === mod.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={editingModuleTitle}
                        onChange={(e) => setEditingModuleTitle(e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editingModuleTitle.trim()) {
                            updateModuleMut.mutate({ moduleId: mod.id, title: editingModuleTitle.trim() });
                            setEditingModuleId(null);
                          }
                        }}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingModuleId(null)}
                        className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => toggle(mod.id)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        {isOpen
                          ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                        <span className="font-medium text-gray-800 text-sm truncate">{mod.title}</span>
                        <span className="ml-1 text-xs text-gray-400 shrink-0">({mod.topics.length} topics)</span>
                      </button>
                      
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Move Module Up */}
                        <button
                          onClick={() => handleMoveModule(mod.id, 'up')}
                          disabled={moduleIndex === 0}
                          className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move module up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        {/* Move Module Down */}
                        <button
                          onClick={() => handleMoveModule(mod.id, 'down')}
                          disabled={moduleIndex === course.modules.length - 1}
                          className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move module down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        {/* Edit Module Title */}
                        <button
                          onClick={() => { setEditingModuleId(mod.id); setEditingModuleTitle(mod.title); }}
                          className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Rename module"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {/* Duplicate Module */}
                        <button
                          onClick={() => duplicateModuleMut.mutate(mod.id)}
                          disabled={duplicateModuleMut.isPending}
                          className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Duplicate module"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {/* Copy Module to Different Course */}
                        <button
                          onClick={() => {
                            setCopyingModule({ id: mod.id, title: mod.title });
                            setTargetCourseId(otherCourses[0]?.id || '');
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Copy module to another course"
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                        </button>
                        {/* Delete Module */}
                        <button
                          onClick={() => delModMut.mutate(mod.id)}
                          disabled={delModMut.isPending}
                          className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete module"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {/* Topics Loop */}
                    {mod.topics.map((t, topicIndex) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {t.videoId || t.videoUrl
                            ? <Video className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            : <span className="h-3.5 w-3.5 shrink-0" />}
                          <span className="text-sm text-gray-700 truncate">{t.title}</span>
                          {t.notes ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700 font-medium">
                              has notes
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          {/* Move Topic Up */}
                          <button
                            onClick={() => handleMoveTopic(mod.id, t.id, 'up')}
                            disabled={topicIndex === 0}
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Move topic up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          {/* Move Topic Down */}
                          <button
                            onClick={() => handleMoveTopic(mod.id, t.id, 'down')}
                            disabled={topicIndex === mod.topics.length - 1}
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Move topic down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          {/* Edit Details */}
                          <button
                            onClick={() =>
                              setEditingTopic({
                                moduleId: mod.id,
                                id: t.id,
                                title: t.title,
                                videoId: t.videoId ?? '',
                                videoUrl: t.videoUrl ?? '',
                                videoType: t.videoType ?? 'bunny',
                                bunnyLibraryId: t.bunnyLibraryId ?? '',
                                attachments: t.attachments ?? [],
                              })
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit topic title/video"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          {/* Edit Notes */}
                          <button
                            onClick={() =>
                              setEditingNotes({
                                moduleId: mod.id,
                                topicId: t.id,
                                title: t.title,
                                notes: t.notes ?? '',
                              })
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit HTML notes"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Notes
                          </button>
                          {/* Delete Topic */}
                          <button
                            onClick={() => delTopicMut.mutate({ moduleId: mod.id, topicId: t.id })}
                            disabled={delTopicMut.isPending}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete topic"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Quick Add Topic */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-100/50">
                      <div className="flex items-center gap-2">
                        <input
                          value={tf.title}
                          onChange={(e) =>
                            setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, title: e.target.value } }))
                          }
                          placeholder="Topic title"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        />
                        <select
                          value={tf.videoType || 'bunny'}
                          onChange={(e) =>
                            setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, videoType: e.target.value } }))
                          }
                          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        >
                          <option value="bunny">Bunny</option>
                          <option value="youtube">YouTube</option>
                        </select>
                        {(!tf.videoType || tf.videoType === 'bunny') && (
                          <input
                            value={tf.bunnyLibraryId || ''}
                            onChange={(e) =>
                              setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, bunnyLibraryId: e.target.value } }))
                            }
                            placeholder="Library ID"
                            className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                          />
                        )}
                        <input
                          value={tf.videoId}
                          onChange={(e) =>
                            setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, videoId: e.target.value } }))
                          }
                          placeholder={tf.videoType === 'youtube' ? "Video URL (YouTube)" : "Video ID (Bunny)"}
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        />
                        <button
                          disabled={!tf.title.trim() || addTopicMut.isPending}
                          onClick={() =>
                            addTopicMut.mutate({
                              moduleId: mod.id,
                              title: tf.title,
                              videoId: tf.videoType === 'youtube' ? '' : tf.videoId,
                              videoUrl: tf.videoType === 'youtube' ? tf.videoId : '',
                              videoType: tf.videoType || 'bunny',
                              bunnyLibraryId: tf.videoType === 'youtube' ? '' : (tf.bunnyLibraryId || ''),
                              attachmentFile: tf.attachmentFile || undefined,
                              attachmentName: tf.attachmentName || undefined,
                            })
                          }
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {addTopicMut.isPending
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Plus className="h-3 w-3" />}
                          Add
                        </button>
                      </div>

                      {/* Optional attachment fields */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">PDF Attachment (Optional):</span>
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          id={`file-upload-${mod.id}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setTopicForms((f) => ({
                                  ...f,
                                  [mod.id]: {
                                    ...tf,
                                    attachmentFile: reader.result as string,
                                    attachmentName: file.name.replace(/\.[^/.]+$/, "")
                                  }
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        {tf.attachmentFile && (
                          <div className="flex-1 flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] text-gray-400 shrink-0">Name:</span>
                            <input
                              value={tf.attachmentName || ''}
                              onChange={(e) =>
                                setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, attachmentName: e.target.value } }))
                              }
                              placeholder="Name/Rename PDF"
                              className="flex-1 rounded border border-gray-200 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white truncate"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`file-upload-${mod.id}`) as HTMLInputElement;
                                if (el) el.value = '';
                                setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, attachmentFile: '', attachmentName: '' } }));
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Clear Attachment"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Module Box */}
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Module</h3>
          <div className="flex gap-2">
            <input
              value={newModTitle}
              onChange={(e) => setNewModTitle(e.target.value)}
              placeholder="Module title"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <button
              disabled={!newModTitle.trim() || addModMut.isPending}
              onClick={() => addModMut.mutate(newModTitle)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {addModMut.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Plus className="h-4 w-4" />}
              Add Module
            </button>
          </div>
          {addModMut.error && (
            <p className="mt-2 text-xs text-red-600">{(addModMut.error as Error).message}</p>
          )}
        </div>
      </div>

      {/* Copy Module Modal Overlay */}
      {copyingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
            <h2 className="font-semibold text-gray-900 mb-2">Copy Module</h2>
            <p className="text-sm text-gray-500 mb-4">
              Copy module <strong className="text-gray-700">"{copyingModule.title}"</strong> to another course:
            </p>
            {otherCourses.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                No other courses available to copy into.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Course</label>
                  <select
                    value={targetCourseId}
                    onChange={(e) => setTargetCourseId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {otherCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {copyModuleMut.error && (
              <p className="mt-3 text-sm text-rose-600">{(copyModuleMut.error as Error).message}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCopyingModule(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (targetCourseId) {
                    copyModuleMut.mutate({ moduleId: copyingModule.id, targetCourseId });
                  }
                }}
                disabled={otherCourses.length === 0 || copyModuleMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {copyModuleMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Copy Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Topic Details Modal Overlay */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
            <h2 className="font-semibold text-gray-900 mb-4">Edit Topic Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic Title *</label>
                <input
                  required
                  value={editingTopic.title}
                  onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video Source</label>
                <select
                  value={editingTopic.videoType || 'bunny'}
                  onChange={(e) => setEditingTopic({ ...editingTopic, videoType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="bunny">Bunny Stream</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>

              {editingTopic.videoType === 'youtube' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (YouTube)</label>
                  <input
                    value={editingTopic.videoUrl}
                    onChange={(e) => setEditingTopic({ ...editingTopic, videoUrl: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Library ID (Bunny Stream)</label>
                    <input
                      value={editingTopic.bunnyLibraryId || ''}
                      onChange={(e) => setEditingTopic({ ...editingTopic, bunnyLibraryId: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. 123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Video ID (Bunny Stream)</label>
                    <input
                      value={editingTopic.videoId}
                      onChange={(e) => setEditingTopic({ ...editingTopic, videoId: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. e3f48eff-6b17-47e7-a4cc-3433adebb20d"
                    />
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="border-t border-gray-150 pt-4 mt-4 select-none">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Topic Attachments & Reference PDFs</label>
                
                {/* List current attachments */}
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                  {editingTopic.attachments && editingTopic.attachments.length > 0 ? (
                    editingTopic.attachments.map((att: any) => (
                      <div key={att.id || att._id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                        {renamingAttachmentId === (att.id || att._id) ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              value={renameInput}
                              onChange={(e) => setRenameInput(e.target.value)}
                              className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (renameInput.trim()) {
                                  renameAttachmentMut.mutate({ attachmentId: att.id || att._id, name: renameInput.trim() });
                                }
                              }}
                              disabled={renameAttachmentMut.isPending}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingAttachmentId(null)}
                              className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-xs font-medium text-gray-700 truncate">{att.name}</p>
                              <a
                                href={att.url.startsWith('http') ? att.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${att.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-indigo-500 hover:underline font-semibold"
                              >
                                View PDF
                              </a>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingAttachmentId(att.id || att._id);
                                  setRenameInput(att.name);
                                }}
                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Rename Attachment"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Delete this attachment?')) {
                                    deleteAttachmentMut.mutate(att.id || att._id);
                                  }
                                }}
                                disabled={deleteAttachmentMut.isPending}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Delete Attachment"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">No attachments uploaded yet.</p>
                  )}
                </div>

                {/* Upload new attachment form */}
                <div className="bg-indigo-50/30 border border-indigo-100 rounded-lg p-3 space-y-2">
                  <span className="text-xs font-semibold text-indigo-900">Upload New Attachment</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    id="modal-file-upload"
                    className="block w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      id="modal-file-name"
                      placeholder="Attachment Display Name"
                      className="flex-1 rounded border border-gray-300 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const fileEl = document.getElementById('modal-file-upload') as HTMLInputElement;
                        const nameEl = document.getElementById('modal-file-name') as HTMLInputElement;
                        const file = fileEl?.files?.[0];
                        const name = nameEl?.value?.trim() || file?.name?.replace(/\.[^/.]+$/, "") || 'Attachment';

                        if (!file) {
                          alert('Please select a PDF file first.');
                          return;
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          addAttachmentMut.mutate({
                            name,
                            file: reader.result as string,
                          }, {
                            onSuccess: () => {
                              if (fileEl) fileEl.value = '';
                              if (nameEl) nameEl.value = '';
                            }
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                      disabled={addAttachmentMut.isPending}
                      className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {addAttachmentMut.isPending ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {updateTopicMut.error && (
              <p className="mt-3 text-sm text-rose-600">{(updateTopicMut.error as Error).message}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingTopic(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingTopic.title.trim()) {
                    updateTopicMut.mutate({
                      moduleId: editingTopic.moduleId,
                      topicId: editingTopic.id,
                      data: {
                        title: editingTopic.title.trim(),
                        videoId: editingTopic.videoType === 'youtube' ? '' : (editingTopic.videoId ? editingTopic.videoId.trim() : ''),
                        videoUrl: editingTopic.videoType === 'youtube' ? (editingTopic.videoUrl ? editingTopic.videoUrl.trim() : '') : '',
                        videoType: editingTopic.videoType || 'bunny',
                        bunnyLibraryId: editingTopic.videoType === 'youtube' ? '' : (editingTopic.bunnyLibraryId ? editingTopic.bunnyLibraryId.trim() : ''),
                      },
                    });
                  }
                }}
                disabled={!editingTopic.title.trim() || updateTopicMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {updateTopicMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Notes HTML editor modal */}
      {editingNotes && id && (
        <NotesEditor
          courseId={id}
          moduleId={editingNotes.moduleId}
          topicId={editingNotes.topicId}
          topicTitle={editingNotes.title}
          initialNotes={editingNotes.notes}
          onClose={() => setEditingNotes(null)}
        />
      )}
    </>
  );
}
