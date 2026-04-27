document.addEventListener('DOMContentLoaded', function () {

    // ── State ──────────────────────────────────────────────────────────
    let cache = {};

    const sortState = {
        saved: { col: 'dateSaved', dir: -1 },
        viewed: { col: 'ts', dir: -1 }
    };

    // ── DOM refs ───────────────────────────────────────────────────────
    const totalBadge = document.getElementById('total-badge');
    const tbodySaved = document.getElementById('tbody-saved');
    const tbodyViewed = document.getElementById('tbody-viewed');
    const emptySaved = document.getElementById('empty-saved');
    const emptyViewed = document.getElementById('empty-viewed');
    const rowCountSaved = document.getElementById('row-count-saved');
    const rowCountViewed = document.getElementById('row-count-viewed');
    const searchSaved = document.getElementById('search-saved');
    const searchViewed = document.getElementById('search-viewed');
    const langFilterSaved = document.getElementById('lang-filter-saved');
    const langFilterViewed = document.getElementById('lang-filter-viewed');
    const savedFilterViewed = document.getElementById('saved-filter-viewed');

    // Description modal
    const descOverlay = document.getElementById('desc-overlay');
    const descClose = document.getElementById('desc-close');
    const descTitle = document.getElementById('desc-modal-title');
    const descBody = document.getElementById('desc-modal-body');

    descClose.addEventListener('click', () => descOverlay.classList.remove('open'));
    descOverlay.addEventListener('click', (e) => {
        if (e.target === descOverlay) descOverlay.classList.remove('open');
    });

    // ── Load data ──────────────────────────────────────────────────────
    chrome.storage.local.get({ jobLanguageCache: {} }, function (result) {
        cache = result.jobLanguageCache || {};
        updateBadge();
        renderSaved();
        renderViewed();
    });

    function updateBadge() {
        const savedCount = Object.values(cache).filter(d => d.saved).length;
        const totalCount = Object.keys(cache).length;
        totalBadge.textContent = `${savedCount} saved · ${totalCount} viewed`;
    }

    // ── Tab switching ──────────────────────────────────────────────────
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.dataset.panel).classList.add('active');
        });
    });

    // ── Filter / search listeners ──────────────────────────────────────
    searchSaved.addEventListener('input', renderSaved);
    langFilterSaved.addEventListener('change', renderSaved);
    searchViewed.addEventListener('input', renderViewed);
    langFilterViewed.addEventListener('change', renderViewed);
    savedFilterViewed.addEventListener('change', renderViewed);

    // ── Column sort ────────────────────────────────────────────────────
    document.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', function () {
            const tbl = this.dataset.table;
            const col = this.dataset.col;
            if (sortState[tbl].col === col) {
                sortState[tbl].dir *= -1;
            } else {
                sortState[tbl].col = col;
                sortState[tbl].dir = 1;
            }
            document.querySelectorAll(`th[data-table="${tbl}"]`).forEach(t => {
                t.classList.remove('sorted');
                t.querySelector('.sort-arrow').textContent = '↕';
            });
            this.classList.add('sorted');
            this.querySelector('.sort-arrow').textContent = sortState[tbl].dir === 1 ? '↑' : '↓';
            if (tbl === 'saved') renderSaved();
            else renderViewed();
        });
    });

    // ── Helpers ────────────────────────────────────────────────────────
    function formatDateTime(isoOrMs) {
        if (!isoOrMs) return '—';
        try {
            const d = new Date(isoOrMs);
            const day = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleString('en-GB', { month: 'short' });
            const year = d.getFullYear();
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${day} ${month} ${year} - ${hh}:${mm}`;
        } catch (e) { return String(isoOrMs); }
    }

    function formatPostedDate(ts, label) {
        if (!ts) return '—';
        return `${formatDateTime(ts)} (${label || 'Posted'})`;
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

    function sortItems(arr, col, dir) {
        return [...arr].sort((a, b) => {
            let av = col === 'lang' ? (a.isEnglish ? 'en' : 'non') : (a[col] || '');
            let bv = col === 'lang' ? (b.isEnglish ? 'en' : 'non') : (b[col] || '');
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }

    function showDescription(title, desc) {
        descTitle.textContent = title || 'Job Description';
        descBody.textContent = desc || '(No description saved)';
        descOverlay.classList.add('open');
    }

    function saveCache(cb) {
        chrome.storage.local.set({ jobLanguageCache: cache }, cb || function () { });
    }

    // ══════════════════════════════════════════════════════════════════
    // SAVED JOBS TAB
    // ══════════════════════════════════════════════════════════════════
    function filterSaved() {
        const q = searchSaved.value.toLowerCase().trim();
        const lv = langFilterSaved.value;

        return Object.entries(cache)
            .filter(([id, data]) => {
                if (!data.saved) return false;
                const hay = [data.title, data.location, data.recruiter, data.email].join(' ').toLowerCase();
                if (q && !hay.includes(q)) return false;
                if (lv === 'en' && !data.isEnglish) return false;
                if (lv === 'non-en' && data.isEnglish) return false;
                if (lv === 'req' && !data.reqLang) return false;
                return true;
            })
            .map(([id, data]) => ({ id, ...data }));
    }

    function renderSaved() {
        const filtered = filterSaved();
        const ss = sortState.saved;
        const sorted = sortItems(filtered, ss.col, ss.dir);

        const totalSaved = Object.values(cache).filter(d => d.saved).length;
        rowCountSaved.textContent = `Showing ${sorted.length} of ${totalSaved} saved jobs`;
        tbodySaved.innerHTML = '';

        if (totalSaved === 0) {
            document.getElementById('table-saved').style.display = 'none';
            emptySaved.style.display = 'block';
            rowCountSaved.textContent = '';
            return;
        }
        document.getElementById('table-saved').style.display = '';
        emptySaved.style.display = 'none';

        sorted.forEach(function (data) {
            const tr = document.createElement('tr');

            // Title (clickable)
            const tdTitle = document.createElement('td');
            tdTitle.innerHTML = data.link
                ? `<a class="job-title-link" href="${data.link}" target="_blank" title="${data.title || ''}">${data.title || 'Untitled'}</a>`
                : `<span class="job-title-link">${data.title || 'Untitled'}</span>`;
            tr.appendChild(tdTitle);

            // Location
            const tdLoc = document.createElement('td');
            tdLoc.innerHTML = `<span class="location-cell" title="${data.location || ''}">${data.location || '—'}</span>`;
            tr.appendChild(tdLoc);

            // Date Saved
            const tdDate = document.createElement('td');
            tdDate.className = 'date-cell';
            tdDate.textContent = formatDateTime(data.dateSaved);
            tr.appendChild(tdDate);

            // Posted Date
            const tdPosted = document.createElement('td');
            tdPosted.className = 'date-cell';
            tdPosted.textContent = formatPostedDate(data.postedTs, data.postedLabel);
            tr.appendChild(tdPosted);

            // Language
            const tdLang = document.createElement('td');
            tdLang.innerHTML = buildLangCell(data);
            tr.appendChild(tdLang);

            // Recruiter (clickable if link exists, truncated to ~30 chars)
            const tdRec = document.createElement('td');
            const fullName = data.recruiter || '—';
            const shortName = fullName.length > 30 ? fullName.substring(0, 30) + '…' : fullName;
            if (data.recruiterLink && data.recruiterLink !== 'N/A') {
                tdRec.innerHTML = `<a class="recruiter-link" href="${data.recruiterLink}" target="_blank" title="${fullName}">${shortName}</a>`;
            } else {
                tdRec.innerHTML = `<span title="${fullName}">${shortName}</span>`;
            }
            tr.appendChild(tdRec);

            // Email
            const tdEmail = document.createElement('td');
            if (data.email && data.email !== 'N/A') {
                tdEmail.innerHTML = `<a class="recruiter-link email-cell" href="mailto:${data.email}" title="${data.email}">${data.email}</a>`;
            } else {
                tdEmail.innerHTML = '<span class="email-cell">—</span>';
            }
            tr.appendChild(tdEmail);

            // Actions
            const tdAct = document.createElement('td');
            tdAct.className = 'actions-cell';

            // Show Description
            const btnDesc = document.createElement('button');
            btnDesc.className = 'action-btn btn-desc';
            btnDesc.innerHTML = '📄';
            btnDesc.addEventListener('click', () => showDescription(data.title, data.description));
            tdAct.appendChild(btnDesc);

            // Remove from saved
            const btnDel = document.createElement('button');
            btnDel.className = 'action-btn btn-del';
            btnDel.innerHTML = '🗑️';
            btnDel.title = 'Remove from saved (keeps in viewed)';
            btnDel.addEventListener('click', function () {
                if (!confirm('Remove this job from saved? It will still appear in Viewed Jobs.')) return;
                const entry = cache[data.id];
                if (entry) {
                    delete entry.saved;
                    delete entry.email;
                    delete entry.recruiter;
                    delete entry.recruiterLink;
                    delete entry.description;
                    delete entry.dateSaved;
                }
                saveCache(() => {
                    updateBadge();
                    renderSaved();
                    renderViewed();
                });
            });
            tdAct.appendChild(btnDel);

            tr.appendChild(tdAct);
            tbodySaved.appendChild(tr);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // VIEWED JOBS TAB
    // ══════════════════════════════════════════════════════════════════
    function filterViewed() {
        const q = searchViewed.value.toLowerCase().trim();
        const lv = langFilterViewed.value;
        const sv = savedFilterViewed.value;

        return Object.entries(cache)
            .filter(([id, data]) => {
                const hay = [data.title, data.location].join(' ').toLowerCase();
                if (q && !hay.includes(q)) return false;
                if (lv === 'en' && !data.isEnglish) return false;
                if (lv === 'non-en' && data.isEnglish) return false;
                if (lv === 'req' && !data.reqLang) return false;
                if (sv === 'saved' && !data.saved) return false;
                if (sv === 'not-saved' && data.saved) return false;
                return true;
            })
            .map(([id, data]) => ({ id, ...data }));
    }

    function renderViewed() {
        const filtered = filterViewed();
        const sv = sortState.viewed;
        const sorted = sortItems(filtered, sv.col, sv.dir);

        const total = Object.keys(cache).length;
        rowCountViewed.textContent = `Showing ${sorted.length} of ${total} viewed jobs`;
        tbodyViewed.innerHTML = '';

        if (total === 0) {
            document.getElementById('table-viewed').style.display = 'none';
            emptyViewed.style.display = 'block';
            rowCountViewed.textContent = '';
            return;
        }
        document.getElementById('table-viewed').style.display = '';
        emptyViewed.style.display = 'none';

        sorted.forEach(function (data) {
            const tr = document.createElement('tr');

            // Title (clickable)
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
            tdSaved.innerHTML = buildSavedBadge(!!data.saved);
            tr.appendChild(tdSaved);

            // Actions
            const tdAct = document.createElement('td');
            tdAct.className = 'actions-cell';

            // Remove completely
            const btnDel = document.createElement('button');
            btnDel.className = 'action-btn btn-del';
            btnDel.innerHTML = '🗑️';
            btnDel.title = 'Permanently remove this job from all history';
            btnDel.addEventListener('click', function () {
                if (!confirm('Permanently remove this job from viewed AND saved history?')) return;
                delete cache[data.id];
                saveCache(() => {
                    updateBadge();
                    renderSaved();
                    renderViewed();
                });
            });
            tdAct.appendChild(btnDel);

            tr.appendChild(tdAct);
            tbodyViewed.appendChild(tr);
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // EXPORT / IMPORT
    // ══════════════════════════════════════════════════════════════════
    const toastEl = document.getElementById('toast');
    let toastTimer;

    function showToast(msg) {
        clearTimeout(toastTimer);
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        toastTimer = setTimeout(() => { toastEl.classList.remove('show'); }, 4000);
    }

    // Export
    document.getElementById('dash-export-btn').addEventListener('click', function () {
        const count = Object.keys(cache).length;
        if (count === 0) {
            showToast('Nothing to export.');
            return;
        }

        const json = JSON.stringify(cache, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: `linkedin_job_data_${new Date().getTime()}.json`,
            saveAs: true
        }, function () {
            showToast(`✅ Exported ${count} jobs.`);
        });
    });

    // Import
    const dashImportFile = document.getElementById('dash-import-file');

    document.getElementById('dash-import-btn').addEventListener('click', function () {
        dashImportFile.click();
    });

    dashImportFile.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                const incoming = JSON.parse(ev.target.result);

                if (typeof incoming !== 'object' || Array.isArray(incoming)) {
                    showToast('❌ Invalid file format.');
                    return;
                }

                const incomingCount = Object.keys(incoming).length;
                if (incomingCount === 0) {
                    showToast('File is empty — nothing to import.');
                    return;
                }

                let newCount = 0;
                let updatedCount = 0;

                Object.entries(incoming).forEach(([id, data]) => {
                    if (!cache[id]) {
                        newCount++;
                    } else {
                        updatedCount++;
                    }
                    cache[id] = { ...(cache[id] || {}), ...data };
                });

                saveCache(() => {
                    showToast(`✅ +${newCount} new, ${updatedCount} updated.`);
                    updateBadge();
                    renderSaved();
                    renderViewed();
                });
            } catch (err) {
                showToast('❌ Failed to parse JSON.');
            }
        };
        reader.readAsText(file);
        dashImportFile.value = '';
    });
});
