document.addEventListener('DOMContentLoaded', function () {

    // ── State ──────────────────────────────────────────────────────────
    let langCache = {};
    let savedJobIds = new Set();

    let sortCol = 'ts';
    let sortDir = -1; // newest first

    // ── DOM refs ───────────────────────────────────────────────────────
    const totalBadge  = document.getElementById('total-badge');
    const tbody       = document.getElementById('jobs-tbody');
    const emptyState  = document.getElementById('empty-state');
    const rowCount    = document.getElementById('row-count');
    const searchInput = document.getElementById('search-input');
    const langFilter  = document.getElementById('lang-filter');
    const savedFilter = document.getElementById('saved-filter');

    // ── Load data ──────────────────────────────────────────────────────
    chrome.storage.local.get({ saved_jobs: [], jobLanguageCache: {} }, function (result) {
        langCache = result.jobLanguageCache || {};

        // Build set of job IDs that are in the saved list
        savedJobIds = new Set();
        (result.saved_jobs || []).forEach(job => {
            const m = job.link && (job.link.match(/\/jobs\/view\/(\d+)/) || job.link.match(/currentJobId=(\d+)/));
            if (m) savedJobIds.add(m[1]);
        });

        const total = Object.keys(langCache).length;
        totalBadge.textContent = total + (total === 1 ? ' viewed' : ' viewed');
        render();
    });

    // ── Filter / search listeners ──────────────────────────────────────
    searchInput.addEventListener('input',  render);
    langFilter.addEventListener('change',  render);
    savedFilter.addEventListener('change', render);

    // ── Column sort ────────────────────────────────────────────────────
    document.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', function () {
            const col = this.dataset.col;
            if (sortCol === col) {
                sortDir *= -1;
            } else {
                sortCol = col;
                sortDir = 1;
            }
            document.querySelectorAll('th[data-col]').forEach(t => {
                t.classList.remove('sorted');
                t.querySelector('.sort-arrow').textContent = '↕';
            });
            this.classList.add('sorted');
            this.querySelector('.sort-arrow').textContent = sortDir === 1 ? '↑' : '↓';
            render();
        });
    });

    // ── Helpers ────────────────────────────────────────────────────────
    function formatDateTime(isoOrMs) {
        if (!isoOrMs) return '—';
        try {
            const d = new Date(isoOrMs);
            const day   = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleString('en-GB', { month: 'short' });
            const year  = d.getFullYear();
            const hh    = String(d.getHours()).padStart(2, '0');
            const mm    = String(d.getMinutes()).padStart(2, '0');
            return `${day} ${month} ${year} - ${hh}:${mm}`;
        } catch (e) { return String(isoOrMs); }
    }

    function formatPostedDate(postedTs, postedLabel) {
        if (!postedTs) return '—';
        return `${formatDateTime(postedTs)} (${postedLabel || 'Posted'})`;
    }

    function buildLangCell(data) {
        if (!data) return '<span class="lang-pill lang-unknown">Unknown</span>';
        let html = data.isEnglish
            ? '<span class="lang-pill lang-en">[EN]</span>'
            : '<span class="lang-pill lang-non">[Non-EN]</span>';
        if (data.reqLang) html += ' <span class="lang-pill lang-req">[Req. Lang]</span>';
        return html;
    }

    function buildSavedBadge(isSaved) {
        return isSaved
            ? '<span style="background:#e8f5e9;color:#2e7d32;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;">✅ Saved</span>'
            : '<span style="background:#f5f5f5;color:#888;padding:3px 8px;border-radius:4px;font-size:11px;">—</span>';
    }

    // ── Filter ─────────────────────────────────────────────────────────
    function getFiltered() {
        const q  = searchInput.value.toLowerCase().trim();
        const lv = langFilter.value;
        const sv = savedFilter.value;

        return Object.entries(langCache)
            .filter(([id, data]) => {
                const hay = [data.title, data.location].join(' ').toLowerCase();
                if (q && !hay.includes(q)) return false;
                if (lv === 'en'     && !data.isEnglish) return false;
                if (lv === 'non-en' &&  data.isEnglish) return false;
                if (lv === 'req'    && !data.reqLang)   return false;
                if (sv === 'saved'     && !savedJobIds.has(id)) return false;
                if (sv === 'not-saved' &&  savedJobIds.has(id)) return false;
                return true;
            })
            .map(([id, data]) => ({ id, ...data }));
    }

    // ── Render ─────────────────────────────────────────────────────────
    function render() {
        const filtered = getFiltered();

        // Sort
        const sorted = [...filtered].sort((a, b) => {
            let av = sortCol === 'lang' ? (a.isEnglish ? 'en' : 'non') : (a[sortCol] || '');
            let bv = sortCol === 'lang' ? (b.isEnglish ? 'en' : 'non') : (b[sortCol] || '');
            if (av < bv) return -1 * sortDir;
            if (av > bv) return  1 * sortDir;
            return 0;
        });

        const total = Object.keys(langCache).length;
        rowCount.textContent = `Showing ${sorted.length} of ${total} viewed jobs`;
        tbody.innerHTML = '';

        if (total === 0) {
            document.getElementById('jobs-table').style.display = 'none';
            emptyState.style.display = 'block';
            rowCount.textContent = '';
            return;
        }
        document.getElementById('jobs-table').style.display = '';
        emptyState.style.display = 'none';

        sorted.forEach(function (data) {
            const isSaved = savedJobIds.has(data.id);
            const tr = document.createElement('tr');

            // Title
            const tdTitle = document.createElement('td');
            tdTitle.innerHTML = data.link
                ? `<a class="job-title-link" href="${data.link}" target="_blank" title="${data.title || ''}">${data.title || 'Job #' + data.id}</a>`
                : `<span class="job-title-link">${data.title || 'Job #' + data.id}</span>`;
            tr.appendChild(tdTitle);

            // Location
            const tdLoc = document.createElement('td');
            tdLoc.innerHTML = `<span class="location-cell" title="${data.location || ''}">${data.location || '—'}</span>`;
            tr.appendChild(tdLoc);

            // Date Viewed
            const tdViewed = document.createElement('td');
            tdViewed.className = 'date-cell';
            tdViewed.textContent = formatDateTime(data.ts);
            tr.appendChild(tdViewed);

            // Posted Date
            const tdPosted = document.createElement('td');
            tdPosted.className = 'date-cell';
            tdPosted.textContent = formatPostedDate(data.postedTs, data.postedLabel);
            tr.appendChild(tdPosted);

            // Language
            const tdLang = document.createElement('td');
            tdLang.innerHTML = buildLangCell(data);
            tr.appendChild(tdLang);

            // Saved?
            const tdSaved = document.createElement('td');
            tdSaved.innerHTML = buildSavedBadge(isSaved);
            tr.appendChild(tdSaved);

            // Actions
            const tdAct = document.createElement('td');
            tdAct.className = 'actions-cell';
            if (data.link) {
                const a = document.createElement('a');
                a.href = data.link; a.target = '_blank';
                a.className = 'action-btn btn-job';
                a.innerHTML = '🔗 View Job';
                tdAct.appendChild(a);
            }
            tr.appendChild(tdAct);

            tbody.appendChild(tr);
        });
    }
});
