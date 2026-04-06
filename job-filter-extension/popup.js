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
});
