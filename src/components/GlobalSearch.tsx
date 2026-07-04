import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { useNavigate } from 'react-router-dom';
import { Search, Users, BookOpen, X, ArrowRight, Loader2, Megaphone } from 'lucide-react';
import clsx from 'clsx';

type ResultItem =
  | { kind: 'user';         id: string; title: string; sub: string; url: string }
  | { kind: 'course';       id: string; title: string; sub: string; url: string }
  | { kind: 'announcement'; id: string; title: string; sub: string; url: string };

const KIND_ICON = {
  user:         <Users      className="h-4 w-4 shrink-0 text-indigo-400" />,
  course:       <BookOpen   className="h-4 w-4 shrink-0 text-emerald-400" />,
  announcement: <Megaphone  className="h-4 w-4 shrink-0 text-amber-400" />,
};

const KIND_LABEL = { user: 'User', course: 'Course', announcement: 'Announcement' };

export default function GlobalSearch() {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();

  const { data: users = [],         isLoading: loadU } = useQuery({ queryKey: ['admin-users'],   queryFn: adminApi.getUsers,         staleTime: 60_000 });
  const { data: courses = [],       isLoading: loadC } = useQuery({ queryKey: ['admin-courses'],  queryFn: adminApi.getCourses,       staleTime: 60_000 });
  const { data: announcements = [], isLoading: loadA } = useQuery({ queryKey: ['admin-annc'],     queryFn: adminApi.getAnnouncements, staleTime: 60_000 });

  const loading = loadU || loadC || loadA;

  // Global shortcut: Ctrl+K or /
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: ResultItem[] = [];

    users.forEach(u => {
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
        out.push({ kind: 'user', id: u.id, title: u.name, sub: u.email, url: '/users' });
      }
    });

    courses.forEach(c => {
      if (
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.modules?.some(m =>
          m.title.toLowerCase().includes(q) ||
          m.topics?.some(t =>
            t.title.toLowerCase().includes(q) ||
            (t.notes ?? '').toLowerCase().includes(q)
          )
        )
      ) {
        out.push({ kind: 'course', id: c.id, title: c.title, sub: c.description || `${c.topicCount} topics`, url: `/courses/${c.id}/manage` });
      }
    });

    announcements.forEach(a => {
      if (a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)) {
        out.push({ kind: 'announcement', id: a.id, title: a.title, sub: a.description?.slice(0, 80) || '', url: '/announcements' });
      }
    });

    return out.slice(0, 20);
  }, [query, users, courses, announcements]);

  useEffect(() => { setCursor(0); }, [results]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function go(url: string) {
    navigate(url);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && results[cursor]) go(results[cursor].url);
    if (e.key === 'Escape') close();
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-400 hover:border-indigo-300 hover:text-gray-600 transition-colors"
        aria-label="Open global search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
          Ctrl K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[10vh] px-4"
          onClick={close}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              {loading
                ? <Loader2 className="h-5 w-5 text-gray-400 animate-spin shrink-0" />
                : <Search className="h-5 w-5 text-gray-400 shrink-0" />
              }
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search users, courses, announcements…"
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none"
                autoComplete="off"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button onClick={close} className="text-gray-400 hover:text-gray-600 ml-1">
                <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd>
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul ref={listRef} className="max-h-80 overflow-y-auto py-2">
                {results.map((r, i) => (
                  <li key={`${r.kind}-${r.id}`}>
                    <button
                      onClick={() => go(r.url)}
                      onMouseEnter={() => setCursor(i)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        cursor === i ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      )}
                    >
                      {KIND_ICON[r.kind]}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400 truncate">{r.sub}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                        {KIND_LABEL[r.kind]}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {query && !loading && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No results for "<span className="font-medium text-gray-600">{query}</span>"
              </div>
            )}

            {!query && (
              <div className="px-4 py-5 text-center text-xs text-gray-400">
                Type to search across users, courses and announcements
              </div>
            )}

            {/* Footer hint */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-2">
              <span className="text-[10px] text-gray-300 flex items-center gap-1">
                <kbd className="rounded border border-gray-200 px-1 py-0.5 font-mono">↑↓</kbd> navigate
              </span>
              <span className="text-[10px] text-gray-300 flex items-center gap-1">
                <kbd className="rounded border border-gray-200 px-1 py-0.5 font-mono">↵</kbd> open
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
