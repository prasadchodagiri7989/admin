import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Search,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  Trash2,
  RefreshCw,
  Clock,
  MapPin,
  Building,
  Check,
  X,
  ChevronRight,
  Filter,
  FileCode,
} from 'lucide-react';
import { adminApi, ScrapedJob, PublishedJob } from '@/api/admin';
import { downloadJobsHtml } from '@/utils/exportJobsHtml';
import clsx from 'clsx';

const AVAILABLE_SITES = [
  { id: 'indeed', label: 'Indeed', color: 'bg-blue-900/10 text-blue-800 border-blue-200' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-600/10 text-blue-600 border-blue-200' },
  { id: 'naukri', label: 'Naukri', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
  { id: 'glassdoor', label: 'Glassdoor', color: 'bg-emerald-600/10 text-emerald-700 border-emerald-200' },
  { id: 'zip_recruiter', label: 'ZipRecruiter', color: 'bg-green-700/10 text-green-800 border-green-200' },
  { id: 'bayt', label: 'Bayt', color: 'bg-amber-600/10 text-amber-700 border-amber-200' },
];

export default function JobScraper() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'scrape' | 'history' | 'published'>('scrape');

  // Scraper Form State
  const [searchTerm, setSearchTerm] = useState('BIM Engineer');
  const [location, setLocation] = useState('India');
  const [selectedSites, setSelectedSites] = useState<string[]>(['indeed', 'linkedin', 'naukri']);
  const [resultsWanted, setResultsWanted] = useState(15);
  const [hoursOld, setHoursOld] = useState<number | null>(72);
  const [isRemote, setIsRemote] = useState(false);

  // Scraped Results State
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const [selectedJobUrls, setSelectedJobUrls] = useState<Set<string>>(new Set());
  const [currentSearchId, setCurrentSearchId] = useState<string | number | null>(null);

  // Preview Modal
  const [previewJob, setPreviewJob] = useState<ScrapedJob | PublishedJob | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Scraper Service Health
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['scraper-health'],
    queryFn: adminApi.getScraperHealth,
    staleTime: 30_000,
    retry: 1,
  });

  // History Query
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['scraper-history'],
    queryFn: adminApi.getScraperHistory,
    enabled: activeTab === 'history',
  });

  // Published Jobs Query
  const [publishedSearch, setPublishedSearch] = useState('');
  const [publishedSite, setPublishedSite] = useState('all');
  const { data: publishedData, isLoading: publishedLoading, refetch: refetchPublished } = useQuery({
    queryKey: ['published-jobs', publishedSearch, publishedSite],
    queryFn: () => adminApi.getPublishedJobs({ search: publishedSearch, site: publishedSite, limit: 50 }),
    enabled: activeTab === 'published',
  });

  // Toggle Site Selection
  const toggleSite = (siteId: string) => {
    if (selectedSites.includes(siteId)) {
      if (selectedSites.length === 1) {
        showToast('At least one platform must be selected', 'error');
        return;
      }
      setSelectedSites(selectedSites.filter((s) => s !== siteId));
    } else {
      setSelectedSites([...selectedSites, siteId]);
    }
  };

  // Run Scraper Mutation
  const scrapeMutation = useMutation({
    mutationFn: () =>
      adminApi.scrapeJobs({
        search_term: searchTerm,
        location,
        sites: selectedSites,
        results_wanted: resultsWanted,
        hours_old: hoursOld,
        is_remote: isRemote,
      }),
    onSuccess: (data) => {
      setScrapedJobs(data.jobs || []);
      setCurrentSearchId(data.search_id);
      setSelectedJobUrls(new Set());
      showToast(`Scraping complete! Found ${data.count} jobs.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['scraper-history'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Scraping failed. Check if python service is running.', 'error');
    },
  });

  // Push / Publish Jobs Mutation
  const publishMutation = useMutation({
    mutationFn: (jobsToPush: ScrapedJob[]) => adminApi.publishJobs(jobsToPush),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      // Mark pushed jobs as published in local state
      setScrapedJobs((prev) =>
        prev.map((job) =>
          selectedJobUrls.has(job.job_url)
            ? { ...job, is_published: true, published_status: 'active' }
            : job
        )
      );
      setSelectedJobUrls(new Set());
      queryClient.invalidateQueries({ queryKey: ['published-jobs'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to publish jobs', 'error');
    },
  });

  // Delete Published Job Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePublishedJob(id),
    onSuccess: () => {
      showToast('Job removed from portal', 'success');
      queryClient.invalidateQueries({ queryKey: ['published-jobs'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete job', 'error');
    },
  });

  // Selection helpers
  const allSelected = useMemo(
    () => scrapedJobs.length > 0 && selectedJobUrls.size === scrapedJobs.length,
    [scrapedJobs, selectedJobUrls]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedJobUrls(new Set());
    } else {
      setSelectedJobUrls(new Set(scrapedJobs.map((j) => j.job_url)));
    }
  };

  const toggleSelectJob = (url: string) => {
    const next = new Set(selectedJobUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelectedJobUrls(next);
  };

  const handlePushSelected = () => {
    const selected = scrapedJobs.filter((j) => selectedJobUrls.has(j.job_url));
    if (!selected.length) {
      showToast('Please select at least one job to push', 'error');
      return;
    }
    publishMutation.mutate(selected);
  };

  const handlePushSingle = (job: ScrapedJob) => {
    publishMutation.mutate([job]);
  };

  // Export Scraped CSV
  const handleExportScrapedCsv = async () => {
    if (!scrapedJobs.length) {
      showToast('No scraped jobs available to export', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('sk_admin_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/job-scraper/export-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ jobs: scrapedJobs }),
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `scraped_jobs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('CSV downloaded successfully', 'success');
    } catch (err: any) {
      showToast('Failed to export CSV: ' + err.message, 'error');
    }
  };

  // Export Published CSV
  const handleExportPublishedCsv = async () => {
    try {
      const token = localStorage.getItem('sk_admin_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/jobs/export-csv`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `published_jobs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Published jobs exported to CSV', 'success');
    } catch (err: any) {
      showToast('Failed to export CSV: ' + err.message, 'error');
    }
  };

  // Export Scraped HTML (Responsive Card View)
  const handleExportScrapedHtml = () => {
    if (!scrapedJobs.length) {
      showToast('No scraped jobs available to export', 'error');
      return;
    }
    try {
      downloadJobsHtml(scrapedJobs, `scraped_jobs_${new Date().toISOString().slice(0, 10)}.html`);
      showToast('HTML jobs file downloaded successfully', 'success');
    } catch (err: any) {
      showToast('Failed to export HTML: ' + err.message, 'error');
    }
  };

  // Export Published HTML (Responsive Card View)
  const handleExportPublishedHtml = async () => {
    try {
      const token = localStorage.getItem('sk_admin_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/jobs/published?limit=1000`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      const jobs = data.jobs || publishedJobs;
      if (!jobs || !jobs.length) {
        showToast('No published jobs available to export', 'error');
        return;
      }
      downloadJobsHtml(jobs, `published_jobs_${new Date().toISOString().slice(0, 10)}.html`);
      showToast('Published jobs exported to HTML', 'success');
    } catch (err: any) {
      showToast('Failed to export HTML: ' + err.message, 'error');
    }
  };

  // Load Previous Search Results
  const loadSearchJobs = async (searchId: string | number) => {
    try {
      const data = await adminApi.getSearchJobs(searchId);
      setScrapedJobs(data.jobs || []);
      setCurrentSearchId(searchId);
      setSelectedJobUrls(new Set());
      setActiveTab('scrape');
      showToast(`Loaded ${data.jobs?.length || 0} jobs from search #${searchId}`, 'info');
    } catch (err: any) {
      showToast('Failed to load search results: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={clsx(
            'fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-4',
            toast.type === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
            toast.type === 'error' && 'bg-rose-50 border-rose-200 text-rose-800',
            toast.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-800'
          )}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <RefreshCw className="h-4 w-4 text-blue-600 shrink-0 animate-spin" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Scraper & Portal</h1>
              <p className="text-sm text-slate-500">
                Scrape live job listings across platforms, review in table view, and push curated jobs to student portal.
              </p>
            </div>
          </div>
        </div>

        {/* Scraper Microservice Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
              health?.running
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            )}
          >
            <span
              className={clsx(
                'h-2 w-2 rounded-full',
                health?.running ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              )}
            />
            <span>
              {healthLoading
                ? 'Checking Scraper...'
                : health?.running
                ? `Scraper Online (Port ${health.port || 5005})`
                : 'Scraper Offline'}
            </span>
          </div>

          <button
            onClick={() => refetchHealth()}
            title="Refresh Service Status"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 gap-2">
        <button
          onClick={() => setActiveTab('scrape')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors',
            activeTab === 'scrape'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <Search className="h-4 w-4" />
          Scrape New Jobs
          {scrapedJobs.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 font-bold">
              {scrapedJobs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors',
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <Clock className="h-4 w-4" />
          Previous Searches
        </button>

        <button
          onClick={() => setActiveTab('published')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors',
            activeTab === 'published'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <UploadCloud className="h-4 w-4" />
          Live Published Jobs
          {publishedData?.total != null && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-bold">
              {publishedData.total}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: SCRAPE NEW JOBS ─── */}
      {activeTab === 'scrape' && (
        <div className="space-y-6">
          {/* Scraper Configuration Form Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-600" />
              Scraping Parameters
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Job Title / Role */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Job Role / Keyword *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. BIM Engineer, Revit Modeler"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. India, Bangalore, Remote"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Results Limit */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Max Results ({resultsWanted})
                </label>
                <select
                  value={resultsWanted}
                  onChange={(e) => setResultsWanted(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value={10}>10 jobs</option>
                  <option value={15}>15 jobs (Recommended)</option>
                  <option value={25}>25 jobs</option>
                  <option value={50}>50 jobs</option>
                  <option value={100}>100 jobs</option>
                  <option value={200}>200 jobs</option>
                  <option value={300}>300 jobs</option>
                  <option value={500}>500 jobs</option>
                </select>
              </div>

              {/* Date Posted (Hours Old) */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Posted Within
                </label>
                <select
                  value={hoursOld ?? ''}
                  onChange={(e) => setHoursOld(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value={24}>Last 24 Hours</option>
                  <option value={72}>Last 3 Days (72 hours)</option>
                  <option value={168}>Last 7 Days (1 week)</option>
                  <option value={720}>Last 30 Days (1 month)</option>
                  <option value="">Anytime</option>
                </select>
              </div>
            </div>

            {/* Target Job Platforms */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                Target Platforms ({selectedSites.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SITES.map((site) => {
                  const isSelected = selectedSites.includes(site.id);
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => toggleSite(site.id)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        isSelected
                          ? `${site.color} ring-2 ring-indigo-400/40 font-bold`
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                      <span>{site.label}</span>
                    </button>
                  );
                })}

                <label className="ml-auto flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={isRemote}
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Remote Jobs Only</span>
                </label>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Scraping live listings runs Python JobSpy in the background across selected sources.
              </span>

              <button
                onClick={() => scrapeMutation.mutate()}
                disabled={scrapeMutation.isPending || !searchTerm.trim()}
                className={clsx(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md transition-all',
                  scrapeMutation.isPending
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-98'
                )}
              >
                {scrapeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Scraping Live Jobs...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Scrape Jobs Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Table Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table Top Bar */}
            <div className="p-4 md:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-900 text-base">Scraped Job Listings</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                  {scrapedJobs.length} Results
                </span>
                {currentSearchId && (
                  <span className="text-xs text-slate-400">Search #{currentSearchId}</span>
                )}
              </div>

              {/* Bulk Action Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedJobUrls.size > 0 && (
                  <button
                    onClick={handlePushSelected}
                    disabled={publishMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    {publishMutation.isPending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    <span>Push Selected ({selectedJobUrls.size}) to Student Portal</span>
                  </button>
                )}

                {scrapedJobs.length > 0 && (
                  <>
                    <button
                      onClick={handleExportScrapedCsv}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={handleExportScrapedHtml}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
                      title="Export as responsive HTML file matching card grid layout"
                    >
                      <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Export HTML</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Table Data */}
            {scrapedJobs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4">
                  <Search className="h-8 w-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No Jobs Scraped Yet</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Configure the search parameters above and click "Scrape Jobs Now", or check the "Previous Searches" tab to reload past results.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="p-4">Role & Company</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Platform</th>
                      <th className="p-4">Job Type</th>
                      <th className="p-4">Date Posted</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scrapedJobs.map((job, idx) => {
                      const isSelected = selectedJobUrls.has(job.job_url);
                      return (
                        <tr
                          key={job.job_url || idx}
                          className={clsx(
                            'hover:bg-slate-50/80 transition-colors',
                            isSelected && 'bg-indigo-50/30'
                          )}
                        >
                          {/* Checkbox */}
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectJob(job.job_url)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Role & Company */}
                          <td className="p-4 max-w-xs">
                            <p className="font-bold text-slate-900 truncate" title={job.title}>
                              {job.title}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <Building className="h-3 w-3 shrink-0" />
                              <span className="truncate">{job.company}</span>
                            </p>
                          </td>

                          {/* Location */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]" title={job.location || 'Not specified'}>
                                {job.location || 'Not specified'}
                              </span>
                            </div>
                            {job.is_remote && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Remote
                              </span>
                            )}
                          </td>

                          {/* Platform Badge */}
                          <td className="p-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {job.site || 'Source'}
                            </span>
                          </td>

                          {/* Job Type */}
                          <td className="p-4 whitespace-nowrap text-xs text-slate-600 capitalize">
                            {job.job_type || 'Full-time'}
                          </td>

                          {/* Date Posted */}
                          <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                            {job.date_posted || 'Recently'}
                          </td>

                          {/* Published Status Badge */}
                          <td className="p-4 whitespace-nowrap">
                            {job.is_published ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                Ready to Push
                              </span>
                            )}
                          </td>

                          {/* Row Actions */}
                          <td className="p-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick View Button */}
                              <button
                                onClick={() => setPreviewJob(job)}
                                title="View Details"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {/* Direct Link */}
                              {job.job_url && (
                                <a
                                  href={job.job_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open Original Job Link"
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}

                              {/* Single Push Button */}
                              {!job.is_published && (
                                <button
                                  onClick={() => handlePushSingle(job)}
                                  disabled={publishMutation.isPending}
                                  title="Push to Student Portal"
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors"
                                >
                                  <UploadCloud className="h-3 w-3" />
                                  <span>Push</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: PREVIOUS SEARCHES ─── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Search History & Past Scrapes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse earlier job searches, view cached results in the table, and re-export CSVs.
              </p>
            </div>
            <button
              onClick={() => refetchHistory()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {historyLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <span>Loading search history...</span>
            </div>
          ) : !historyData?.mongo_searches?.length && !historyData?.python_searches?.length ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <span>No past searches recorded yet.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Search Query</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Platforms</th>
                    <th className="p-4">Results Count</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyData?.mongo_searches?.map((s: any) => (
                    <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{s.searchTerm}</td>
                      <td className="p-4 text-xs text-slate-600">{s.location || 'Any'}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {s.sites?.map((site: string) => (
                            <span
                              key={site}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700"
                            >
                              {site}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{s.resultsCount} jobs</td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        {s.searchId && (
                          <button
                            onClick={() => loadSearchJobs(s.searchId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors"
                          >
                            <span>Load Table</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: PUBLISHED JOBS MANAGEMENT ─── */}
      {activeTab === 'published' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Filter */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={publishedSearch}
                  onChange={(e) => setPublishedSearch(e.target.value)}
                  placeholder="Filter published jobs..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Site Filter */}
              <select
                value={publishedSite}
                onChange={(e) => setPublishedSite(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All Platforms</option>
                <option value="indeed">Indeed</option>
                <option value="linkedin">LinkedIn</option>
                <option value="naukri">Naukri</option>
                <option value="glassdoor">Glassdoor</option>
              </select>
            </div>

            {/* Export Published to CSV & HTML */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPublishedCsv}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Export Published CSV</span>
              </button>

              <button
                onClick={handleExportPublishedHtml}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
                title="Export published jobs as responsive HTML file matching card grid layout"
              >
                <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                <span>Export Published HTML</span>
              </button>

              <button
                onClick={() => refetchPublished()}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh list"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Published Jobs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {publishedLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <span>Loading published jobs...</span>
              </div>
            ) : !publishedData?.jobs?.length ? (
              <div className="p-12 text-center text-slate-400">
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <h4 className="text-base font-bold text-slate-800">No Published Jobs Found</h4>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                  Scrape jobs from the first tab and click "Push Selected" to make them visible on the student portal.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Title & Company</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Platform</th>
                      <th className="p-4">Job Type</th>
                      <th className="p-4">Date Posted</th>
                      <th className="p-4">Published At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {publishedData.jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 max-w-xs">
                          <p className="font-bold text-slate-900 truncate" title={job.title}>
                            {job.title}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Building className="h-3 w-3 shrink-0" />
                            <span className="truncate">{job.company}</span>
                          </p>
                        </td>

                        <td className="p-4 text-xs text-slate-600 whitespace-nowrap">
                          {job.location || 'Anywhere'}
                          {job.is_remote && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Remote
                            </span>
                          )}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                            {job.site || 'Other'}
                          </span>
                        </td>

                        <td className="p-4 text-xs text-slate-600 capitalize whitespace-nowrap">
                          {job.job_type || 'Full-time'}
                        </td>

                        <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                          {job.date_posted || 'Recently'}
                        </td>

                        <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPreviewJob(job)}
                              title="View Details"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <a
                              href={job.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Visit Application Page"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>

                            <button
                              onClick={() => {
                                if (confirm(`Remove "${job.title}" from the student portal?`)) {
                                  deleteMutation.mutate(job.id);
                                }
                              }}
                              title="Delete / Unpublish"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
        </div>
      )}

      {/* ─── JOB DETAILS PREVIEW MODAL ─── */}
      {previewJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/50">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mb-2">
                  {previewJob.site || 'Platform'}
                </span>
                <h3 className="text-xl font-bold text-slate-900 leading-snug">{previewJob.title}</h3>
                <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span>{previewJob.company}</span>
                  <span>•</span>
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{previewJob.location || 'Location Not Specified'}</span>
                </p>
              </div>

              <button
                onClick={() => setPreviewJob(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Job Type</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {previewJob.job_type || 'Full-time'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Workplace</span>
                  <span className="font-bold text-slate-800">
                    {previewJob.is_remote ? 'Remote' : 'On-site / Hybrid'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Date Posted</span>
                  <span className="font-bold text-slate-800">{previewJob.date_posted || 'Recent'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Salary</span>
                  <span className="font-bold text-slate-800">
                    {'salary' in previewJob && previewJob.salary?.min_amount
                      ? `${previewJob.salary.currency || ''} ${previewJob.salary.min_amount} - ${previewJob.salary.max_amount}`
                      : 'min_amount' in previewJob && previewJob.min_amount
                      ? `${previewJob.currency || ''} ${previewJob.min_amount} - ${previewJob.max_amount}`
                      : 'Competitive'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Job Description</h4>
                <div className="whitespace-pre-line text-slate-600 leading-relaxed max-h-72 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {previewJob.description || 'No detailed description provided by scraping source.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <a
                href={previewJob.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <span>Open Application Link</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewJob(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Close
                </button>

                {'is_published' in previewJob && !previewJob.is_published && (
                  <button
                    onClick={() => {
                      handlePushSingle(previewJob as ScrapedJob);
                      setPreviewJob(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Push to Student Portal</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
