import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { 
  MessageSquare, Trash2, Send, CornerDownRight, FileText, 
  X, AlertCircle, Loader2, Download, Paperclip 
} from 'lucide-react';
import clsx from 'clsx';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  avatar?: string | null;
}

interface DiscussionItem {
  id: string;
  _id?: string;
  courseId: string;
  courseTitle: string;
  topicId: string;
  topicTitle: string;
  userId: UserDetail;
  content: string;
  attachment?: {
    name: string;
    url: string;
  };
  parentId: string | null;
  createdAt: string;
}

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleString('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export default function Discussions() {
  const qc = useQueryClient();

  // Selected class & topic
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch discussions list (defensive initialization)
  const { data: discussions = [], isLoading, error } = useQuery<DiscussionItem[]>({
    queryKey: ['admin-discussions'],
    queryFn: adminApi.getDiscussions,
  });

  // Fetch courses list
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: adminApi.getCourses,
  });

  const selectedCourse = Array.isArray(courses) ? courses.find((c) => c.id === selectedCourseId) : null;
  const topics = selectedCourse && selectedCourse.modules
    ? selectedCourse.modules.flatMap((m) => m.topics)
    : [];
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  // Filter students activity feed defensively
  const studentDiscussions = Array.isArray(discussions)
    ? discussions.filter((d) => d.userId?.role !== 'admin')
    : [];

  const handleOpenDialog = () => {
    if (!selectedCourseId || !selectedTopicId) return;
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 p-6 md:p-8 space-y-6 -m-4 md:-m-6 animate-in fade-in duration-300 font-sans">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Discussions Board</h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose a course and topic to moderate threads, or view recent student comment feeds.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 font-semibold shadow-inner">
          <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
          <span>{Array.isArray(discussions) ? discussions.length : 0} total posts</span>
        </div>
      </div>

      {/* Select Course & Lesson Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Select Class & Topic</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Course Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Class / Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedTopicId('');
              }}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors"
            >
              <option value="">-- Choose Course --</option>
              {Array.isArray(courses) && courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Topic / Lesson
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={!selectedCourseId}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-40 transition-colors"
            >
              <option value="">-- Choose Lesson --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleOpenDialog}
            disabled={!selectedCourseId || !selectedTopicId}
            className="flex h-10 items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Open Discussion Thread</span>
          </button>
        </div>
      </div>

      {/* Recent Comments Feed (Notifications) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <div className="relative">
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <MessageSquare className="h-4.5 w-4.5 text-indigo-500" />
          </div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Student Comments Feed</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <span>Loading activity feed...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-xs text-red-400 py-3 bg-red-500/5 border border-red-500/10 rounded-lg px-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Failed to load recent activity feed. Please verify login session.</span>
          </div>
        ) : studentDiscussions.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No comments have been posted by students yet.</p>
        ) : (
          <div className="divide-y divide-slate-800/60 max-h-[350px] overflow-y-auto pr-2 space-y-3.5 pt-1">
            {studentDiscussions.slice(0, 10).map((d) => {
              const currentId = d.id || d._id || '';
              return (
                <div key={currentId} className="flex items-start justify-between gap-4 pt-3.5 first:pt-0 group">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-semibold text-indigo-400">{d.userId?.name || 'Student'}</span>
                      <span className="text-slate-500 font-mono">({d.userId?.email || ''})</span>
                      <span className="text-slate-500">commented on</span>
                      <span className="font-medium text-slate-350">{d.courseTitle}</span>
                      <span className="text-slate-500">→</span>
                      <span className="font-medium text-indigo-400/90">{d.topicTitle}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-800/50 whitespace-pre-line">
                      {d.content}
                    </p>
                    <span className="block text-[9px] text-slate-500 font-semibold">
                      {formatTime(d.createdAt)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedCourseId(d.courseId);
                      setSelectedTopicId(d.topicId);
                      setIsDialogOpen(true);
                    }}
                    className="flex h-7 shrink-0 items-center rounded bg-slate-800 hover:bg-slate-750 px-3 text-[10px] font-semibold text-white transition-colors border border-slate-750/60 shadow"
                  >
                    Moderate
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Discussions Dialog */}
      {isDialogOpen && selectedCourse && selectedTopic && (
        <DiscussionsDialog
          courseId={selectedCourseId}
          courseTitle={selectedCourse.title}
          topicId={selectedTopicId}
          topicTitle={selectedTopic.title}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Discussions Dialog Subcomponent (Mirroring User Interface) ────────────────── */
interface DialogProps {
  courseId: string;
  courseTitle: string;
  topicId: string;
  topicTitle: string;
  onClose: () => void;
}

function DiscussionsDialog({ courseId, courseTitle, topicId, topicTitle, onClose }: DialogProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [content, setContent] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; file: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL as string;

  // Fetch discussions for this topicId defensively
  const { data: discussions = [], isLoading, error } = useQuery<DiscussionItem[]>({
    queryKey: ['admin-discussions-topic', topicId],
    queryFn: () => adminApi.getDiscussions().then(list => {
      return Array.isArray(list) ? list.filter(d => d.topicId === topicId) : [];
    }),
  });

  // Create discussion/reply mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      courseId: string;
      topicId: string;
      content: string;
      parentId?: string | null;
      attachment?: { name: string; file: string } | null;
    }) => adminApi.createDiscussion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-discussions-topic', topicId] });
      setContent('');
      setReplyContent('');
      setReplyToId(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
    },
    onError: (err: any) => {
      alert("Error posting discussion: " + err.message);
    }
  });

  // Delete discussion/reply mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDiscussion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-discussions-topic', topicId] });
    },
    onError: (err: any) => {
      alert("Error deleting: " + err.message);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max limit is 5MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        file: reader.result as string,
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const text = parentId ? replyContent : content;
    if (!text.trim() && !selectedFile) return;

    createMutation.mutate({
      courseId,
      topicId,
      content: text,
      parentId,
      attachment: selectedFile,
    });
  };

  // Build tree tree
  const rootDiscussions = Array.isArray(discussions)
    ? discussions.filter((d) => !d.parentId || d.parentId === 'null')
    : [];

  const getReplies = (parentId: string) =>
    Array.isArray(discussions)
      ? discussions.filter((d) => {
          const parent = typeof d.parentId === 'object' && d.parentId
            ? (d.parentId as any).id || (d.parentId as any)._id
            : d.parentId;
          return parent === parentId;
        })
      : [];

  const getDisplayName = (d: DiscussionItem) => {
    return d.userId?.role === 'admin' ? 'Tutour' : d.userId?.name || 'Unknown User';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="flex flex-col bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850 bg-slate-900">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">Discussions Board</h2>
            <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
              <span>{courseTitle}</span>
              <span className="text-slate-600">→</span>
              <span className="text-indigo-400 font-semibold">{topicTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/20">
          {/* Post Form */}
          <form onSubmit={(e) => handlePostSubmit(e, null)} className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 shadow-inner">
            <textarea
              placeholder="Ask a question or share reference material as Tutour..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none transition-colors"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex h-8 items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5" />
                  )}
                  <span>Attach Document</span>
                </button>

                {selectedFile && (
                  <div className="flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-0.5 text-[10px] border border-slate-700">
                    <FileText className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span className="truncate max-w-[150px] font-semibold">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-slate-500 hover:text-white transition-colors ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending || (!content.trim() && !selectedFile)}
                className="flex h-8 items-center gap-1.5 rounded bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-semibold text-white transition-colors disabled:opacity-40"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Post</span>
              </button>
            </div>
          </form>

          {/* List of Conversations */}
          {isLoading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load discussion board.</span>
            </div>
          ) : rootDiscussions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 italic border border-dashed border-slate-800 rounded-xl text-xs">
              No discussions posted for this lesson yet.
            </div>
          ) : (
            <div className="space-y-6">
              {rootDiscussions.map((root) => {
                const currentRootId = root.id || root._id || '';
                const replies = getReplies(currentRootId);
                const isRootAdmin = root.userId?.role === 'admin';
                const avatarUrl = root.userId?.avatar;

                return (
                  <div key={currentRootId} className="group rounded-xl border border-slate-800 p-4 bg-slate-950/40 hover:border-slate-750 transition-colors space-y-3 shadow-sm">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE.replace('/api', '')}${avatarUrl}`}
                              alt={getDisplayName(root)}
                              className="h-8 w-8 rounded-full border border-slate-800 object-cover"
                            />
                          ) : (
                            <div className={clsx(
                              "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold tracking-wider border border-slate-850",
                              isRootAdmin ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-350"
                            )}>
                              {isRootAdmin ? "TU" : getInitials(root.userId?.name || 'User')}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white">
                              {getDisplayName(root)}
                            </span>
                            {isRootAdmin && (
                              <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-indigo-400">
                                Tutour
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500">
                            {formatTime(root.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (confirm("Delete this thread and all replies?")) {
                            deleteMutation.mutate(currentRootId);
                          }
                        }}
                        className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete post"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Content */}
                    <p className="text-xs text-slate-300 leading-relaxed pl-1 whitespace-pre-line">
                      {root.content}
                    </p>

                    {/* Attachment */}
                    {root.attachment && root.attachment.url && (
                      <div className="pl-1">
                        <a
                          href={`${API_BASE.replace('/api', '')}${root.attachment.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950/60 p-2 text-[10px] text-slate-300 hover:bg-slate-900 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 text-red-400" />
                          <span className="truncate max-w-[150px]">{root.attachment.name}</span>
                          <Download className="h-2.5 w-2.5 text-slate-500" />
                        </a>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-4 pl-1 text-[10px]">
                      <button
                        onClick={() => {
                          setReplyToId(replyToId === currentRootId ? null : currentRootId);
                          setReplyContent('');
                          setSelectedFile(null);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Reply
                      </button>
                      {replies.length > 0 && (
                        <span className="text-slate-550">
                          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>

                    {/* Nested Replies */}
                    {replies.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-850 space-y-3 pl-4 border-l border-slate-800 ml-4">
                        {replies.map((reply) => {
                          const currentReplyId = reply.id || reply._id || '';
                          const isReplyAdmin = reply.userId?.role === 'admin';
                          const replyAvatarUrl = reply.userId?.avatar;

                          return (
                            <div key={currentReplyId} className="group/reply flex items-start gap-3 bg-slate-950/20 hover:bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/40 transition-colors">
                              <div className="relative">
                                {replyAvatarUrl ? (
                                  <img
                                    src={replyAvatarUrl.startsWith('http') ? replyAvatarUrl : `${API_BASE.replace('/api', '')}${replyAvatarUrl}`}
                                    alt={getDisplayName(reply)}
                                    className="h-7 w-7 rounded-full border border-slate-800 object-cover"
                                  />
                                ) : (
                                  <div className={clsx(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold border border-slate-850",
                                    isReplyAdmin ? "bg-indigo-600 text-white font-bold" : "bg-slate-850 text-slate-355"
                                  )}>
                                    {isReplyAdmin ? "TU" : getInitials(reply.userId?.name || 'User')}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-white">
                                        {getDisplayName(reply)}
                                      </span>
                                      {isReplyAdmin && (
                                        <span className="rounded bg-indigo-500/20 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-indigo-400 scale-90">
                                          Tutour
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[8px] text-slate-500">
                                      {formatTime(reply.createdAt)}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (confirm("Delete this reply?")) {
                                        deleteMutation.mutate(currentReplyId);
                                      }
                                    }}
                                    className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                    title="Delete reply"
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                                  {reply.content}
                                </p>

                                {reply.attachment && reply.attachment.url && (
                                  <div className="pt-1">
                                    <a
                                      href={`${API_BASE.replace('/api', '')}${reply.attachment.url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded border border-slate-850 bg-slate-950/60 p-1 px-2.5 text-[9px] text-slate-350 hover:bg-slate-900 transition-colors"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-red-400" />
                                      <span className="truncate max-w-[150px]">{reply.attachment.name}</span>
                                      <Download className="h-2.5 w-2.5 text-slate-500" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply Input Form */}
                    {replyToId === currentRootId && (
                      <form onSubmit={(e) => handlePostSubmit(e, currentRootId)} className="mt-3 pl-4 flex flex-col gap-2 border-l border-slate-800 ml-4 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                          <CornerDownRight className="h-3.5 w-3.5" />
                          <span>Replying as Tutour</span>
                        </div>

                        <textarea
                          placeholder="Write your response..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none transition-colors"
                        />

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id={`reply-file-input-${currentRootId}`}
                              ref={replyFileInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`reply-file-input-${currentRootId}`)?.click()}
                              disabled={isUploading}
                              className="flex h-7 items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2.5 text-[10px] font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                            >
                              {isUploading ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin text-indigo-500" />
                              ) : (
                                <Paperclip className="h-3 w-3" />
                              )}
                              <span>Attach File</span>
                            </button>

                            {selectedFile && (
                              <div className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[9px] border border-slate-700">
                                <FileText className="h-3 w-3 text-red-400" />
                                <span className="truncate max-w-[120px] font-semibold">{selectedFile.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedFile(null)}
                                  className="text-slate-500 hover:text-white transition-colors"
                                >
                                  <X className="h-2.5 w-2.5 ml-1" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyToId(null);
                                setSelectedFile(null);
                              }}
                              className="px-2.5 py-1 text-[9px] font-bold text-slate-450 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={createMutation.isPending || (!replyContent.trim() && !selectedFile)}
                              className="flex h-7 items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-700 px-2.5 text-[10px] font-semibold text-white transition-colors disabled:opacity-40 shadow-md"
                            >
                              {createMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              <span>Reply</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
