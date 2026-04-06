document.addEventListener('DOMContentLoaded', function () {
    const jobCountElem = document.getElementById('job-count');
    const downloadBtn = document.getElementById('download-btn');
    const clearBtn = document.getElementById('clear-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');

    let currentJobs = [];

    // Open Dashboard in new tab
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', function () {
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
        });
    }

    // Load jobs from storage
    function loadJobs() {
        chrome.storage.local.get({ saved_jobs: [] }, function(result) {
            currentJobs = result.saved_jobs;
            jobCountElem.textContent = currentJobs.length;
            
            if (currentJobs.length > 0) {
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
        
        // Define headers
        const headers = ['Title', 'Link', 'Email', 'Recruiter', 'Recruiter Link', 'Date Saved', 'Description'];
        let csv = headers.map(h => `"${h}"`).join(',') + '\r\n';

        objArray.forEach(job => {
            const row = [
                job.title || '',
                job.link || '',
                job.email || '',
                job.recruiter || '',
                job.recruiterLink || '',
                job.dateSaved || '',
                job.description || ''
            ];
            
            // Escape quotes and wrap each field in quotes
            const formattedRow = row.map(field => {
                const strField = String(field);
                return `"${strField.replace(/"/g, '""')}"`;
            });

            csv += formattedRow.join(',') + '\r\n';
        });

        return csv;
    }

    // Handle Download
    downloadBtn.addEventListener('click', function() {
        if (currentJobs.length === 0) return;

        const csvContent = convertToCSV(currentJobs);
        const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' }); // adding BOM for Excel unicode Support
        const url = URL.createObjectURL(blob);
        
        // Use Chrome downloads API
        chrome.downloads.download({
            url: url,
            filename: `linkedin_saved_jobs_${new Date().getTime()}.csv`,
            saveAs: true // Let the user choose where to save
        });
    });

    // Handle Clear
    clearBtn.addEventListener('click', function() {
        if (confirm("Are you sure you want to clear all saved jobs? This cannot be undone.")) {
            chrome.storage.local.set({ saved_jobs: [] }, function() {
                loadJobs();
            });
        }
    });
    // Handle Clear History
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function() {
            if (confirm("Are you sure you want to clear your job viewing history (Language Tags)? This cannot be undone.")) {
                chrome.storage.local.remove('jobLanguageCache', function() {
                    const originalText = clearHistoryBtn.innerText;
                    clearHistoryBtn.innerText = "✅ Cleared!";
                    setTimeout(() => {
                        clearHistoryBtn.innerText = originalText;
                    }, 2000);
                });
            }
        });
    }
});
