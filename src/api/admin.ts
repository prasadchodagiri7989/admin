import { apiFetch } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  users:   { total: number; admins: number; students: number; newThisWeek: number };
  courses: { total: number; totalModules: number; totalTopics: number };
  logins:  { today: number; thisWeek: number; total: number };
  loginsByDay:    { date: string; count: number }[];
  recentActivity: ActivityRecord[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  status: 'active' | 'blocked' | 'pending';
  avatar: string | null;
  hasGoogle: boolean;
  createdAt: string;
  lastLogin: string | null;
  lastIp: string | null;
  loginCount: number;
}

export interface AdminTopic {
  id: string;
  title: string;
  videoUrl?: string;
  videoId?: string;
  videoType?: 'bunny' | 'youtube';
  completed: boolean;
  notes?: string;
  attachments?: { id: string; name: string; url: string }[];
}

export interface AdminModule {
  id: string;
  title: string;
  topics: AdminTopic[];
}

export interface AdminCourse {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  isSample: boolean;
  batches: string[];
  lessonsCount: number;
  moduleCount: number;
  topicCount: number;
  modules: AdminModule[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminBatch {
  id: string;
  name: string;
  description: string;
  members: { id: string; name: string; email: string; status: string }[];
  courses: { id: string; title: string; description: string }[];
  moduleOrder?: { courseId: string; moduleIds: string[] }[];
}

export interface ActivityRecord {
  id: string;
  user: { id?: string; name: string; email: string } | null;
  ip: string;
  method: 'email' | 'google';
  userAgent: string | null;
  createdAt: string;
  faceCard?: string | null;
}

export interface ActivityResponse {
  data: ActivityRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SuspiciousLogin {
  ip: string;
  method: string;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  createdAt: string;
}

export interface SuspiciousUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'blocked';
  distinctIPs: string[];
  ipCount: number;
  deviceCount: number;
  lastActiveIP: string;
  totalLogins: number;
  lastLogin: string;
  firstLogin: string;
  methods: string[];
  riskLevel: 'medium' | 'high' | 'critical';
  recentLogins: SuspiciousLogin[];
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  description: string;
  date: string;
  targetRole: 'all' | 'student' | 'admin';
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const adminApi = {
  // Auth (shared endpoint)
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  // Stats
  getStats: () => apiFetch<AdminStats>('/admin/stats'),

  // Users
  getUsers:   ()                                              => apiFetch<AdminUser[]>('/admin/users'),
  createUser: (data: { name: string; email: string; role: string; password?: string; status?: string }) =>
    apiFetch<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { name?: string; email?: string; role?: string; status?: string }) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    apiFetch<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' }),
  blockUser: (id: string) =>
    apiFetch<{ message: string; user: AdminUser }>(`/admin/users/block/${id}`, { method: 'POST' }),
  unblockUser: (id: string) =>
    apiFetch<{ message: string; user: AdminUser }>(`/admin/users/unblock/${id}`, { method: 'POST' }),
  bulkCreateUsers: (users: { name: string; email: string; role?: string; password?: string }[]) =>
    apiFetch<{ message: string; created: number; skipped: number; errors: { email: string; reason: string }[] }>(
      '/admin/users/bulk', { method: 'POST', body: JSON.stringify({ users }) }
    ),

  // Courses
  getCourses:   () => apiFetch<AdminCourse[]>('/admin/courses'),
  createCourse: (data: { title: string; description?: string; thumbnail?: string }) =>
    apiFetch<AdminCourse>('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
  uploadThumbnail: (image: string) =>
    apiFetch<{ thumbnailUrl: string }>('/admin/courses/upload-thumbnail', { method: 'POST', body: JSON.stringify({ image }) }),
  updateCourse: (id: string, data: { title?: string; description?: string; thumbnail?: string }) =>
    apiFetch<AdminCourse>(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id: string) =>
    apiFetch<{ message: string }>(`/admin/courses/${id}`, { method: 'DELETE' }),

  // Modules
  addModule:    (courseId: string, title: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify({ title }) }),
  deleteModule: (courseId: string, moduleId: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' }),

  // Topics
  addTopic:    (courseId: string, moduleId: string, data: { title: string; videoId?: string; videoUrl?: string; videoType?: string; attachmentFile?: string; attachmentName?: string }) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/topics`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  deleteTopic: (courseId: string, moduleId: string, topicId: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/topics/${topicId}`, { method: 'DELETE' }),
  updateTopicNotes: (courseId: string, moduleId: string, topicId: string, notes: string) =>
    apiFetch<{ message: string }>(
      `/admin/courses/${courseId}/modules/${moduleId}/topics/${topicId}/notes`,
      { method: 'PUT', body: JSON.stringify({ notes }) }
    ),

  // Modules Reorder, Update, Duplicate, Copy
  reorderModules: (courseId: string, moduleIds: string[]) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/reorder`, {
      method: 'PUT', body: JSON.stringify({ moduleIds }),
    }),
  updateModule: (courseId: string, moduleId: string, title: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}`, {
      method: 'PUT', body: JSON.stringify({ title }),
    }),
  duplicateModule: (courseId: string, moduleId: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/duplicate`, {
      method: 'POST',
    }),
  copyModuleToCourse: (courseId: string, moduleId: string, targetCourseId: string) =>
    apiFetch<{ message: string }>(`/admin/courses/${courseId}/modules/${moduleId}/copy-to/${targetCourseId}`, {
      method: 'POST',
    }),

  // Topics Reorder & Update details
  reorderTopics: (courseId: string, moduleId: string, topicIds: string[]) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/topics/reorder`, {
      method: 'PUT', body: JSON.stringify({ topicIds }),
    }),
  updateTopic: (courseId: string, moduleId: string, topicId: string, data: { title?: string; videoId?: string; videoUrl?: string; videoType?: string }) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/topics/${topicId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  // Activity
  getActivity: (page = 1, limit = 50) =>
    apiFetch<ActivityResponse>(`/admin/activity?page=${page}&limit=${limit}`),

  // Suspicious
  getSuspiciousActivity: () => apiFetch<SuspiciousUser[]>('/admin/suspicious'),

  // Announcements
  getAnnouncements: () => apiFetch<AdminAnnouncement[]>('/admin/announcements'),
  createAnnouncement: (data: { title: string; description?: string; targetRole?: string }) =>
    apiFetch<AdminAnnouncement>('/admin/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id: string, data: { title?: string; description?: string; targetRole?: string }) =>
    apiFetch<AdminAnnouncement>(`/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) =>
    apiFetch<{ message: string }>(`/admin/announcements/${id}`, { method: 'DELETE' }),

  // Batches CRUD
  getBatches: () => apiFetch<AdminBatch[]>('/admin/batches'),
  getBatchById: (id: string) => apiFetch<AdminBatch>(`/admin/batches/${id}`),
  createBatch: (data: { name: string; description?: string }) =>
    apiFetch<AdminBatch>('/admin/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id: string, data: { name?: string; description?: string }) =>
    apiFetch<AdminBatch>(`/admin/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBatch: (id: string) =>
    apiFetch<{ message: string }>(`/admin/batches/${id}`, { method: 'DELETE' }),
  addBatchMember: (batchId: string, userId: string) =>
    apiFetch<AdminBatch>(`/admin/batches/${batchId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeBatchMember: (batchId: string, userId: string) =>
    apiFetch<AdminBatch>(`/admin/batches/${batchId}/members/${userId}`, { method: 'DELETE' }),
  alignBatchCourses: (batchId: string, courseIds: string[]) =>
    apiFetch<AdminBatch>(`/admin/batches/${batchId}/courses`, { method: 'POST', body: JSON.stringify({ courseIds }) }),

  // Attachments
  addAttachment: (courseId: string, moduleId: string, topicId: string, name: string, file: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/topics/${topicId}/attachments`, {
      method: 'POST', body: JSON.stringify({ name, file }),
    }),
  renameAttachment: (courseId: string, moduleId: string, topicId: string, attachmentId: string, name: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/topics/${topicId}/attachments/${attachmentId}`, {
      method: 'PUT', body: JSON.stringify({ name }),
    }),
  deleteAttachment: (courseId: string, moduleId: string, topicId: string, attachmentId: string) =>
    apiFetch<AdminCourse>(`/admin/courses/${courseId}/modules/${moduleId}/topics/${topicId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }),

  // Batch Module Sequencing
  reorderBatchModules: (batchId: string, courseId: string, moduleIds: string[]) =>
    apiFetch<AdminBatch>(`/admin/batches/${batchId}/courses/${courseId}/modules/reorder`, {
      method: 'POST', body: JSON.stringify({ moduleIds }),
    }),

  // Discussions
  getDiscussions: () => apiFetch<any[]>('/discussions'),
  createDiscussion: (data: {
    courseId: string;
    topicId: string;
    content: string;
    parentId?: string | null;
    attachment?: { name: string; file: string } | null;
  }) =>
    apiFetch<any>('/discussions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDiscussion: (id: string) =>
    apiFetch<{ message: string }>(`/discussions/${id}`, { method: 'DELETE' }),
};
