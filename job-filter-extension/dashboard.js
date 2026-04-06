document.addEventListener('DOMContentLoaded', function () {
    let allJobs = [];
    let langCache = {};
    let sortCol = 'dateSaved';
    let sortDir = -1; // -1 = descending (newest first)

    const tbody = document.getElementById('jobs-tbody');
    const emptyState = document.getElementById('empty-state');
    const totalBadge = document.getElementById('total-badge');
    const rowCount = document.getElementById('row-count');
    const searchInput = document.getElementById('search-input');
    const langFilter = document.getElementById('lang-filter');

    // Load saved jobs + language cache together
    chrome.storage.local.get({ saved_jobs: [], jobLanguageCache: {} }, function (result) {
        allJobs = result.saved_jobs || [];
        langCache = result.jobLanguageCache || {};
        totalBadge.textContent = allJobs.length + (allJobs.length === 1 ? ' job' : ' jobs');
        render();
    });

    // Search + filter listeners
    searchInput.addEventListener('input', render);
    langFilter.addEventListener('change', render);

    // Column sort listeners
    document.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', function () {
            const col = this.dataset.col;
            if (sortCol === col) {
                sortDir *= -1;
            } else {
                sortCol = col;
                sortDir = 1;
            }
            document.querySelectorAll('th[data-col]').forEach(t => t.classList.remove('sorted'));
            this.classList.add('sorted');
            this.querySelector('.sort-arrow').textContent = sortDir === 1 ? '↑' : '↓';
            render();
        });
    });

    function getLangData(job) {
        // Try to extract job ID from the link
        const match = job.link && (job.link.match(/\/jobs\/view\/(\d+)/) || job.link.match(/currentJobId=(\d+)/));
        const jobId = match ? match[1] : null;
        if (jobId && langCache[jobId]) {
            return langCache[jobId];
        }
        return null;
    }

    function filterJobs() {
        const query = searchInput.value.toLowerCase().trim();
        const langVal = langFilter.value;

        return allJobs.filter(job => {
            // Text search
            const haystack = [job.title, job.recruiter, job.email, job.link].join(' ').toLowerCase();
            if (query && !haystack.includes(query)) return false;

            // Language filter
            if (langVal !== 'all') {
                const ld = getLangData(job);
                if (langVal === 'unknown' && ld !== null) return false;
                if (langVal === 'unknown' && ld === null) return true;
                if (!ld) return false;
                if (langVal === 'en' && !ld.isEnglish) return false;
                if (langVal === 'non-en' && ld.isEnglish) return false;
                if (langVal === 'req' && !ld.reqLang) return false;
            }

            return true;
        });
    }

    function sortJobs(jobs) {
        return [...jobs].sort((a, b) => {
            let av = a[sortCol] || '';
            let bv = b[sortCol] || '';

            if (sortCol === 'lang') {
                const ad = getLangData(a);
                const bd = getLangData(b);
                av = ad ? (ad.isEnglish ? 'en' : 'non') : 'z';
                bv = bd ? (bd.isEnglish ? 'en' : 'non') : 'z';
            }

            if (av < bv) return -1 * sortDir;
            if (av > bv) return 1 * sortDir;
            return 0;
        });
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) { return iso; }
    }

    function buildLangCell(ld) {
        if (!ld) return '<span class="lang-pill lang-unknown">Unknown</span>';
        let html = ld.isEnglish
            ? '<span class="lang-pill lang-en">[EN]</span>'
            : '<span class="lang-pill lang-non">[Non-EN]</span>';
        if (ld.reqLang) {
            html += '<br><span class="lang-pill lang-req">[Req. Lang]</span>';
        }
        return html;
    }

    function deleteJob(index, filteredId) {
        if (!confirm('Remove this job from your saved list?')) return;
        // filteredId is the original index in allJobs
        allJobs.splice(filteredId, 1);
        chrome.storage.local.set({ saved_jobs: allJobs }, function () {
            totalBadge.textContent = allJobs.length + (allJobs.length === 1 ? ' job' : ' jobs');
            render();
        });
    }

    function render() {
        const filtered = filterJobs();
        const sorted = sortJobs(filtered);

        rowCount.textContent = `Showing ${sorted.length} of ${allJobs.length} saved jobs`;

        if (allJobs.length === 0) {
            document.getElementById('jobs-table').style.display = 'none';
            emptyState.style.display = 'block';
            rowCount.textContent = '';
            return;
        }

        document.getElementById('jobs-table').style.display = '';
        emptyState.style.display = 'none';

        tbody.innerHTML = '';

        sorted.forEach(function (job) {
            const originalIndex = allJobs.indexOf(job);
            const ld = getLangData(job);

            const tr = document.createElement('tr');

            // Title
            const tdTitle = document.createElement('td');
            tdTitle.innerHTML = job.link
                ? `<a class="job-title-link" href="${job.link}" target="_blank" title="${job.title || ''}">${job.title || 'Untitled'}</a>`
                : `<span class="job-title-link" title="${job.title || ''}">${job.title || 'Untitled'}</span>`;
            tr.appendChild(tdTitle);

            // Recruiter
            const tdRecruiter = document.createElement('td');
            if (job.recruiterLink && job.recruiterLink !== 'N/A') {
                tdRecruiter.innerHTML = `<a class="recruiter-link" href="${job.recruiterLink}" target="_blank"><span class="recruiter-name" title="${job.recruiter || ''}">${job.recruiter || 'N/A'}</span> ↗</a>`;
            } else {
                tdRecruiter.innerHTML = `<span class="recruiter-name" title="${job.recruiter || ''}">${job.recruiter || 'N/A'}</span>`;
            }
            tr.appendChild(tdRecruiter);

            // Email
            const tdEmail = document.createElement('td');
            if (job.email && job.email !== 'N/A') {
                tdEmail.innerHTML = `<a class="recruiter-link email-cell" href="mailto:${job.email}" title="${job.email}">${job.email}</a>`;
            } else {
                tdEmail.innerHTML = `<span class="email-cell">—</span>`;
            }
            tr.appendChild(tdEmail);

            // Date
            const tdDate = document.createElement('td');
            tdDate.className = 'date-cell';
            tdDate.textContent = formatDate(job.dateSaved);
            tr.appendChild(tdDate);

            // Language
            const tdLang = document.createElement('td');
            tdLang.innerHTML = buildLangCell(ld);
            tr.appendChild(tdLang);

            // Actions
            const tdActions = document.createElement('td');
            tdActions.className = 'actions-cell';

            // View Job
            if (job.link) {
                const btnJob = document.createElement('a');
                btnJob.href = job.link;
                btnJob.target = '_blank';
                btnJob.className = 'action-btn btn-job';
                btnJob.innerHTML = '🔗 View Job';
                tdActions.appendChild(btnJob);
            }

            // View HR
            if (job.recruiterLink && job.recruiterLink !== 'N/A') {
                const btnHR = document.createElement('a');
                btnHR.href = job.recruiterLink;
                btnHR.target = '_blank';
                btnHR.className = 'action-btn btn-hr';
                btnHR.innerHTML = '👤 View HR';
                tdActions.appendChild(btnHR);
            }

            // Delete
            const btnDel = document.createElement('button');
            btnDel.className = 'action-btn btn-del';
            btnDel.innerHTML = '🗑️';
            btnDel.title = 'Remove from saved jobs';
            btnDel.addEventListener('click', function () { deleteJob(0, originalIndex); });
            tdActions.appendChild(btnDel);

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    }
});
