document.addEventListener('DOMContentLoaded', function () {
    const jobCountElem = document.getElementById('job-count');
    const downloadBtn = document.getElementById('download-btn');
    const clearBtn = document.getElementById('clear-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');

    let savedJobs = []; // array of job objects where saved === true

    // Open Dashboard in new tab
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', function () {
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
        });
    }

    // Load saved jobs from unified cache
    function loadJobs() {
        chrome.storage.local.get({ jobLanguageCache: {} }, function (result) {
            const cache = result.jobLanguageCache || {};
            savedJobs = Object.entries(cache)
                .filter(([id, data]) => data.saved === true)
                .map(([id, data]) => ({ id, ...data }));

            jobCountElem.textContent = savedJobs.length;

            if (savedJobs.length > 0) {
                downloadBtn.disabled = false;
                clearBtn.disabled = false;
            } else {
                downloadBtn.disabled = true;
                clearBtn.disabled = true;
            }
        });
    }

    loadJobs();

    // Convert array of objects to CSV string
    function convertToCSV(objArray) {
        if (!objArray || objArray.length === 0) return '';

        const headers = ['Title', 'Link', 'Location', 'Email', 'Recruiter', 'Recruiter Link', 'Date Saved', 'Description'];
        let csv = headers.map(h => `"${h}"`).join(',') + '\r\n';

        objArray.forEach(job => {
            const row = [
                job.title || '',
                job.link || '',
                job.location || '',
                job.email || '',
                job.recruiter || '',
                job.recruiterLink || '',
                job.dateSaved || '',
                job.description || ''
            ];

            const formattedRow = row.map(field => {
                const strField = String(field);
                return `"${strField.replace(/"/g, '""')}"`;
            });

            csv += formattedRow.join(',') + '\r\n';
        });

        return csv;
    }

    // Handle Download
    downloadBtn.addEventListener('click', function () {
        if (savedJobs.length === 0) return;

        const csvContent = convertToCSV(savedJobs);
        const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: `linkedin_saved_jobs_${new Date().getTime()}.csv`,
            saveAs: true
        });
    });

    // Handle Clear Saved Jobs (only removes saved flag + save-only fields, keeps viewing history)
    clearBtn.addEventListener('click', function () {
        if (confirm("Are you sure you want to clear all saved jobs? This will remove save data but keep viewing history.")) {
            chrome.storage.local.get({ jobLanguageCache: {} }, function (result) {
                const cache = result.jobLanguageCache || {};
                Object.keys(cache).forEach(id => {
                    if (cache[id].saved) {
                        delete cache[id].saved;
                        delete cache[id].email;
                        delete cache[id].recruiter;
                        delete cache[id].recruiterLink;
                        delete cache[id].description;
                        delete cache[id].dateSaved;
                    }
                });
                chrome.storage.local.set({ jobLanguageCache: cache }, function () {
                    loadJobs();
                });
            });
        }
    });

    // Handle Clear Viewing History (wipes the entire cache)
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function () {
            if (confirm("Are you sure you want to clear your entire viewing history? This will also remove saved jobs. This cannot be undone.")) {
                chrome.storage.local.remove('jobLanguageCache', function () {
                    const originalText = clearHistoryBtn.innerText;
                    clearHistoryBtn.innerText = "✅ Cleared!";
                    loadJobs();
                    setTimeout(() => {
                        clearHistoryBtn.innerText = originalText;
                    }, 2000);
                });
            }
        });
    }

    // ── Hide Viewed / Applied toggles ──
    const hideViewedToggle  = document.getElementById('hide-viewed-toggle');
    const hideAppliedToggle = document.getElementById('hide-applied-toggle');

    // Load saved toggle state
    chrome.storage.local.get({ hideViewed: false, hideApplied: false }, function (result) {
        hideViewedToggle.checked  = result.hideViewed;
        hideAppliedToggle.checked = result.hideApplied;
    });

    // Save on change and notify content script immediately
    function saveToggleAndRefresh() {
        chrome.storage.local.set({
            hideViewed:  hideViewedToggle.checked,
            hideApplied: hideAppliedToggle.checked
        }, () => {
            // Tell the active LinkedIn tab to re-run hideJobs right now
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshHideJobs' });
                }
            });
        });
    }

    hideViewedToggle.addEventListener('change',  saveToggleAndRefresh);
    hideAppliedToggle.addEventListener('change', saveToggleAndRefresh);

    // ── Export / Import ──
    const exportBtn   = document.getElementById('export-btn');
    const importBtn   = document.getElementById('import-btn');
    const importFile  = document.getElementById('import-file');
    const syncStatus  = document.getElementById('sync-status');

    function showStatus(msg, isError) {
        syncStatus.textContent = msg;
        syncStatus.style.color = isError ? '#dc3545' : '#28a745';
        setTimeout(() => { syncStatus.textContent = ''; }, 4000);
    }

    // Export: download entire jobLanguageCache as JSON
    exportBtn.addEventListener('click', function () {
        chrome.storage.local.get({ jobLanguageCache: {} }, function (result) {
            const cache = result.jobLanguageCache || {};
            const count = Object.keys(cache).length;
            if (count === 0) {
                showStatus('Nothing to export.', true);
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
                showStatus(`✅ Exported ${count} jobs.`, false);
            });
        });
    });

    // Import: trigger hidden file input
    importBtn.addEventListener('click', function () {
        importFile.click();
    });

    importFile.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                const incoming = JSON.parse(ev.target.result);

                if (typeof incoming !== 'object' || Array.isArray(incoming)) {
                    showStatus('❌ Invalid file format.', true);
                    return;
                }

                const incomingCount = Object.keys(incoming).length;
                if (incomingCount === 0) {
                    showStatus('File is empty — nothing to import.', true);
                    return;
                }

                // Merge: incoming entries win for same job ID, local-only entries kept
                chrome.storage.local.get({ jobLanguageCache: {} }, function (result) {
                    const local = result.jobLanguageCache || {};
                    const merged = { ...local };

                    let newCount = 0;
                    let updatedCount = 0;

                    Object.entries(incoming).forEach(([id, data]) => {
                        if (!merged[id]) {
                            newCount++;
                        } else {
                            updatedCount++;
                        }
                        // Deep-merge: spread local first, then incoming wins
                        merged[id] = { ...(merged[id] || {}), ...data };
                    });

                    chrome.storage.local.set({ jobLanguageCache: merged }, function () {
                        showStatus(`✅ +${newCount} new, ${updatedCount} updated.`, false);
                        loadJobs(); // refresh saved count
                    });
                });
            } catch (err) {
                showStatus('❌ Failed to parse JSON.', true);
            }
        };
        reader.readAsText(file);

        // Reset so same file can be re-imported
        importFile.value = '';
    });
});
