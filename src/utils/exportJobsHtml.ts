/**
 * Generates and downloads a self-contained, responsive HTML file
 * representing the exported jobs in a LinkedIn-style card layout
 * matching the user's reference design.
 */

export interface ExportableJob {
  title: string;
  company: string;
  location?: string;
  site?: string;
  job_type?: string;
  is_remote?: boolean | number;
  min_amount?: number | null;
  max_amount?: number | null;
  currency?: string;
  interval?: string;
  date_posted?: string;
  job_url: string;
  job_url_direct?: string;
  description?: string;
  salary?: {
    min_amount?: number | null;
    max_amount?: number | null;
    currency?: string;
    interval?: string;
  };
  company_logo?: string;
  raw_json?: any;
}

// Deterministic logo background colors for companies without custom logo
const LOGO_COLORS = [
  { bg: '#d92d20', text: '#ffffff' }, // Red (WSP)
  { bg: '#0f172a', text: '#ffffff' }, // Black/Navy (Jacobs, Mace)
  { bg: '#1c1917', text: '#fde047' }, // Dark Slate + Gold (Sobha)
  { bg: '#0284c7', text: '#ffffff' }, // Sky Blue (Agile)
  { bg: '#1e3a8a', text: '#ffffff' }, // Deep Blue (MaRS)
  { bg: '#0d9488', text: '#ffffff' }, // Teal (Tacton)
  { bg: '#059669', text: '#ffffff' }, // Emerald
  { bg: '#4f46e5', text: '#ffffff' }, // Indigo
  { bg: '#18181b', text: '#38bdf8' }, // Dark + Cyan (Vertiv)
];

function getCompanyColor(companyName: string) {
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % LOGO_COLORS.length;
  return LOGO_COLORS[index];
}

function getCompanyInitials(name: string): string {
  if (!name) return "JB";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatSalary(job: ExportableJob): string {
  const min = job.salary?.min_amount ?? job.min_amount;
  const max = job.salary?.max_amount ?? job.max_amount;
  const curr = job.salary?.currency ?? job.currency ?? 'INR';
  const interval = job.salary?.interval ?? job.interval ?? 'yr';

  if (!min && !max) return '';
  if (min && max) {
    if (curr === 'INR' || curr === '₹') {
      const minK = min >= 1000 ? `${Math.round(min / 1000)}K` : min;
      const maxK = max >= 1000 ? `${Math.round(max / 1000)}K` : max;
      return `${minK} - ${maxK} ${curr}/${interval}`;
    }
    return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()} / ${interval}`;
  }
  const val = min || max;
  if (!val) return '';
  if (curr === 'INR' || curr === '₹') {
    const valK = val >= 1000 ? `${Math.round(val / 1000)}K` : val;
    return `${valK} ${curr}/${interval}`;
  }
  return `${curr} ${val.toLocaleString()} / ${interval}`;
}

function formatPostedTime(dateStr?: string): { text: string; isRecent: boolean } {
  if (!dateStr) return { text: '1 week ago', isRecent: false };
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { text: dateStr, isRecent: false };
    }
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return { text: 'Just now', isRecent: true };
    if (diffHours < 24) return { text: `${diffHours} hours ago`, isRecent: true };
    if (diffDays === 1) return { text: '1 day ago', isRecent: false };
    if (diffDays < 7) return { text: `${diffDays} days ago`, isRecent: false };
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return { text: '1 week ago', isRecent: false };
    if (weeks < 4) return { text: `${weeks} weeks ago`, isRecent: false };
    const months = Math.floor(diffDays / 30);
    return { text: `${months} ${months === 1 ? 'month' : 'months'} ago`, isRecent: false };
  } catch {
    return { text: dateStr || 'Recently', isRecent: false };
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildJobsHtml(jobs: ExportableJob[], pageTitle = "More jobs"): string {
  const jobCards = jobs.map((job, idx) => {
    const title = escapeHtml(job.title || "Job Opening");
    const company = escapeHtml(job.company || "Company");
    const location = escapeHtml(job.location || (job.is_remote ? "Remote" : "India"));
    const salaryText = escapeHtml(formatSalary(job));
    const { text: postedTime, isRecent } = formatPostedTime(job.date_posted);
    const applyUrl = job.job_url || job.job_url_direct || "#";
    const colors = getCompanyColor(job.company || `Job ${idx}`);
    const initials = escapeHtml(getCompanyInitials(job.company || "JB"));
    const isEasyApply = (job.site || "").toLowerCase().includes("linkedin") || (job.job_url || "").includes("linkedin.com");

    // Random connection count simulation or indicator matching screenshot
    const connectionCount = ((idx * 73 + 18) % 350) + 8;
    const showConnections = idx % 2 === 0;

    return `
      <article class="job-card" data-title="${title.toLowerCase()}" data-company="${company.toLowerCase()}" data-location="${location.toLowerCase()}">
        <div class="card-header">
          <div class="company-logo" style="background-color: ${colors.bg}; color: ${colors.text};">
            ${initials}
          </div>
        </div>

        <div class="card-body">
          <a href="${escapeHtml(applyUrl)}" target="_blank" rel="noopener noreferrer" class="job-title-link">
            <h2 class="job-title">
              ${title}
              <svg class="verified-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Verified Listing">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </h2>
          </a>
          <p class="company-name">${company}</p>
          <p class="job-location">${location}</p>

          ${salaryText ? `<p class="job-salary">${salaryText}</p>` : ''}

          <div class="badges-row">
            ${showConnections ? `
              <div class="connections-badge">
                <div class="avatar-stack">
                  <span class="mini-avatar" style="background: #3b82f6;"></span>
                  <span class="mini-avatar" style="background: #ec4899;"></span>
                  <span class="mini-avatar" style="background: #eab308;"></span>
                </div>
                <span>${connectionCount} connections work here</span>
              </div>
            ` : `
              <div class="active-badge">
                <svg class="active-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Actively reviewing applicants</span>
              </div>
            `}
          </div>
        </div>

        <div class="card-footer">
          <span class="posted-status">
            Promoted · <span class="${isRecent ? 'recent-time' : ''}">${escapeHtml(postedTime)}</span>
          </span>
          ${isEasyApply ? `
            <div class="easy-apply-badge">
              <span class="in-icon">in</span>
              <span>Easy Apply</span>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1e293b;
      line-height: 1.5;
      padding: 32px 16px 64px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Top Bar */
    .header-bar {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    @media (min-width: 640px) {
      .header-bar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .page-heading {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .search-filter-box {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      max-width: 420px;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      outline: none;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      border-color: #0a66c2;
      box-shadow: 0 0 0 3px rgba(10, 102, 194, 0.15);
    }

    .jobs-count {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      white-space: nowrap;
    }

    /* Grid Layout */
    .jobs-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
    }

    @media (min-width: 640px) {
      .jobs-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .jobs-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Card Styling */
    .job-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .job-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .company-logo {
      width: 46px;
      height: 46px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 15px;
      letter-spacing: 0.5px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      flex-shrink: 0;
    }

    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .job-title-link {
      text-decoration: none;
      display: inline-block;
      margin-bottom: 4px;
    }

    .job-title {
      font-size: 15.5px;
      font-weight: 700;
      color: #0a66c2;
      line-height: 1.35;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      word-break: break-word;
      transition: color 0.15s ease;
    }

    .job-title-link:hover .job-title {
      color: #004182;
      text-decoration: underline;
    }

    .verified-icon {
      width: 14px;
      height: 14px;
      color: #475569;
      flex-shrink: 0;
    }

    .company-name {
      font-size: 13.5px;
      font-weight: 500;
      color: #334155;
      margin-bottom: 2px;
    }

    .job-location {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .job-salary {
      font-size: 12.5px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }

    .badges-row {
      margin-top: 6px;
      margin-bottom: 12px;
      min-height: 24px;
    }

    .active-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12.5px;
      font-weight: 500;
      color: #057642;
    }

    .active-icon {
      width: 15px;
      height: 15px;
      color: #057642;
      flex-shrink: 0;
    }

    .connections-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748b;
    }

    .avatar-stack {
      display: flex;
      align-items: center;
    }

    .mini-avatar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid #ffffff;
      margin-left: -5px;
      display: inline-block;
    }

    .mini-avatar:first-child {
      margin-left: 0;
    }

    /* Footer */
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #64748b;
    }

    .posted-status {
      white-space: nowrap;
    }

    .recent-time {
      color: #057642;
      font-weight: 600;
    }

    .easy-apply-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #0a66c2;
    }

    .in-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      background: #0a66c2;
      color: #ffffff;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 800;
      text-transform: lowercase;
      line-height: 1;
    }

    .no-results {
      grid-column: 1 / -1;
      text-align: center;
      padding: 48px 16px;
      color: #64748b;
      font-size: 15px;
      background: #ffffff;
      border-radius: 12px;
      border: 1px dashed #cbd5e1;
      display: none;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .search-filter-box {
        display: none;
      }
      .job-card {
        box-shadow: none;
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <h1 class="page-heading">${escapeHtml(pageTitle)}</h1>
      <div class="search-filter-box">
        <input
          type="text"
          id="search-input"
          class="search-input"
          placeholder="Filter by title, company, or location..."
          aria-label="Filter jobs"
        />
        <span id="jobs-count" class="jobs-count">${jobs.length} jobs</span>
      </div>
    </div>

    <div id="jobs-grid" class="jobs-grid">
      ${jobCards}
      <div id="no-results" class="no-results">
        No jobs matched your filter. Try adjusting your search query.
      </div>
    </div>
  </div>

  <script>
    (function() {
      const input = document.getElementById('search-input');
      const countEl = document.getElementById('jobs-count');
      const cards = Array.from(document.querySelectorAll('.job-card'));
      const noResults = document.getElementById('no-results');
      const total = cards.length;

      if (!input || !countEl) return;

      input.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        let visibleCount = 0;

        cards.forEach(card => {
          const title = card.getAttribute('data-title') || '';
          const comp = card.getAttribute('data-company') || '';
          const loc = card.getAttribute('data-location') || '';

          const matches = !query || title.includes(query) || comp.includes(query) || loc.includes(query);
          if (matches) {
            card.style.display = 'flex';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        countEl.textContent = query ? (visibleCount + ' of ' + total + ' jobs') : (total + ' jobs');
        if (noResults) {
          noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }
      });
    })();
  </script>
</body>
</html>`;
}

/**
 * Initiates download of the generated HTML file in the browser.
 */
export function downloadJobsHtml(jobs: ExportableJob[], filename = `jobs_${new Date().toISOString().slice(0, 10)}.html`) {
  const html = buildJobsHtml(jobs);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
