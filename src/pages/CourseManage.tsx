import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminCourse, type AdminModule } from '@/api/admin';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Loader2, Video,
  FileText, Save, Eye, Code,
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

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (mid: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(mid) ? n.delete(mid) : n.add(mid);
      return n;
    });

  const [editingNotes, setEditingNotes] = useState<{
    moduleId: string; topicId: string; title: string; notes: string;
  } | null>(null);

  const [newModTitle, setNewModTitle] = useState('');
  const [topicForms, setTopicForms] = useState<Record<string, { title: string; videoUrl: string }>>({});

  const refetch = () => qc.invalidateQueries({ queryKey: ['admin-courses'] });

  const addModMut = useMutation({
    mutationFn: (title: string) => adminApi.addModule(id!, title),
    onSuccess: () => { refetch(); setNewModTitle(''); },
  });

  const delModMut = useMutation({
    mutationFn: (moduleId: string) => adminApi.deleteModule(id!, moduleId),
    onSuccess: refetch,
  });

  const addTopicMut = useMutation({
    mutationFn: ({ moduleId, title, videoUrl }: { moduleId: string; title: string; videoUrl: string }) =>
      adminApi.addTopic(id!, moduleId, { title, videoUrl: videoUrl || undefined }),
    onSuccess: (_data, vars) => {
      refetch();
      setTopicForms((f) => ({ ...f, [vars.moduleId]: { title: '', videoUrl: '' } }));
    },
  });

  const delTopicMut = useMutation({
    mutationFn: ({ moduleId, topicId }: { moduleId: string; topicId: string }) =>
      adminApi.deleteTopic(id!, moduleId, topicId),
    onSuccess: refetch,
  });

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
      <div className="space-y-5 max-w-3xl">
        <div>
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Courses
          </button>
          <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {course.moduleCount} modules · {course.topicCount} topics
          </p>
        </div>

        <div className="space-y-3">
          {(course.modules as AdminModule[]).map((mod) => {
            const isOpen = expanded.has(mod.id);
            const tf = topicForms[mod.id] ?? { title: '', videoUrl: '' };

            return (
              <div
                key={mod.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => toggle(mod.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-gray-400" />
                      : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <span className="font-medium text-gray-800 text-sm">{mod.title}</span>
                    <span className="ml-1 text-xs text-gray-400">({mod.topics.length} topics)</span>
                  </button>
                  <button
                    onClick={() => delModMut.mutate(mod.id)}
                    disabled={delModMut.isPending}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {mod.topics.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {t.videoUrl
                            ? <Video className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            : <span className="h-3.5 w-3.5 shrink-0" />}
                          <span className="text-sm text-gray-700 truncate">{t.title}</span>
                          {t.notes ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0 text-xs text-emerald-700 font-medium">
                              has notes
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            onClick={() =>
                              setEditingNotes({
                                moduleId: mod.id,
                                topicId: t.id,
                                title: t.title,
                                notes: t.notes ?? '',
                              })
                            }
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit HTML notes"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Notes
                          </button>
                          <button
                            onClick={() => delTopicMut.mutate({ moduleId: mod.id, topicId: t.id })}
                            disabled={delTopicMut.isPending}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        value={tf.title}
                        onChange={(e) =>
                          setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, title: e.target.value } }))
                        }
                        placeholder="Topic title"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <input
                        value={tf.videoUrl}
                        onChange={(e) =>
                          setTopicForms((f) => ({ ...f, [mod.id]: { ...tf, videoUrl: e.target.value } }))
                        }
                        placeholder="Video URL (optional)"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <button
                        disabled={!tf.title.trim() || addTopicMut.isPending}
                        onClick={() =>
                          addTopicMut.mutate({ moduleId: mod.id, title: tf.title, videoUrl: tf.videoUrl })
                        }
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {addTopicMut.isPending
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Plus className="h-3 w-3" />}
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Module</h3>
          <div className="flex gap-2">
            <input
              value={newModTitle}
              onChange={(e) => setNewModTitle(e.target.value)}
              placeholder="Module title"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              disabled={!newModTitle.trim() || addModMut.isPending}
              onClick={() => addModMut.mutate(newModTitle)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
