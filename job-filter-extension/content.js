const countriesToRemove = [
    // "Lithuania",
    // "Romania",
    // "France",
    // "Ukraine",
    // "Italy",
    // "Poland",
    // "Portugal",
    // "Estonia",
    // "Bulgaria",
    // "Latvia",
    // "Slovakia",
    // "Slovenia",
    // "Hungary",
    // "Croatia",
    // "Greece",
    // "Cyprus",
    // "Malta",
    // "Belarus",
    // "Moldova",
    // "Serbia",
    // "Bosnia",
    // "Albania",
    // "Montenegro",
    // "North Macedonia",
    // "Kosovo",
    // "Czechia",
    // "Czech Republic",
    // "Spain",

    // Lithuania
    "Lithuania", "Vilnius", "Kaunas", "Klaipeda", "Siauliai", "Panevezys",

    // Romania
    "Romania", "Bucharest", "Cluj", "Cluj-Napoca", "Timisoara", "Iasi", "Constanta", "Brasov", "Transylvania",

    // France
    "France", "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Ile-de-France",

    // Ukraine
    "Ukraine", "Kyiv", "Kiev", "Kharkiv", "Odesa", "Odessa", "Dnipro", "Lviv", "Zaporizhzhia", "Donetsk",

    // Italy
    "Italy", "Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Venice", "Lombardy", "Lazio", "Campania",

    // Poland
    "Poland", "Warsaw", "Krakow", "Cracow", "Lodz", "Wroclaw", "Poznan", "Gdansk", "Szczecin", "Bydgoszcz", "Lublin", "Silesia", "Pomerania",

    // Portugal
    "Portugal", "Lisbon", "Porto", "Amadora", "Braga", "Algarve", "Madeira", "Azores", "Coimbra",

    // Estonia
    "Estonia", "Tallinn", "Tartu", "Narva", "Parnu",

    // Bulgaria
    "Bulgaria", "Sofia", "Plovdiv", "Varna", "Burgas", "Ruse",

    // Latvia
    "Latvia", "Riga", "Daugavpils", "Liepaja", "Jelgava",

    // Slovakia
    "Slovakia", "Bratislava", "Kosice", "Presov", "Zilina",

    // Slovenia
    "Slovenia", "Ljubljana", "Maribor", "Celje", "Kranj",

    // Hungary
    "Hungary", "Budapest", "Debrecen", "Szeged", "Miskolc", "Pecs", "Gyor",

    // Croatia
    "Croatia", "Zagreb", "Split", "Rijeka", "Osijek", "Zadar", "Dalmatia",

    // Greece
    "Greece", "Athens", "Thessaloniki", "Patras", "Heraklion", "Crete", "Peloponnese", "Larissa",

    // Cyprus
    "Cyprus", "Nicosia", "Limassol", "Larnaca", "Paphos",

    // Malta
    "Malta", "Valletta", "Birkirkara", "Mosta", "Sliema",

    // Belarus
    "Belarus", "Minsk", "Gomel", "Vitebsk", "Mogilev", "Grodno", "Brest",

    // Moldova
    "Moldova", "Chisinau", "Tiraspol", "Balti", "Bender",

    // Serbia
    "Serbia", "Belgrade", "Novi Sad", "Nis", "Kragujevac", "Vojvodina",

    // Bosnia and Herzegovina
    "Bosnia", "Bosnia and Herzegovina", "Sarajevo", "Banja Luka", "Tuzla", "Zenica", "Mostar",

    // Albania
    "Albania", "Tirana", "Durres", "Vlore", "Elbasan", "Shkoder",

    // Montenegro
    "Montenegro", "Podgorica", "Niksic", "Budva", "Kotor",

    // North Macedonia
    "North Macedonia", "Skopje", "Bitola", "Kumanovo", "Prilep",

    // Kosovo
    "Kosovo", "Pristina", "Prizren", "Ferizaj", "Peja",

    // Czech Republic / Czechia
    "Czechia", "Czech Republic", "Prague", "Brno", "Ostrava", "Plzen", "Liberec", "Olomouc", "Bohemia", "Moravia",

    // Spain
    "Spain", "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma", "Catalonia", "Andalusia", "Galicia", "Basque Country", "Bilbao"
];

let inMemoryLangCache = {};

// Load language cache from storage initially
chrome.storage.local.get(['jobLanguageCache'], function (result) {
    if (result.jobLanguageCache) {
        inMemoryLangCache = result.jobLanguageCache;
        if (typeof injectListLabels === 'function') injectListLabels();
    }
});

// Listen for updates to cache
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && changes.jobLanguageCache) {
        inMemoryLangCache = changes.jobLanguageCache.newValue || {};
        if (typeof injectListLabels === 'function') injectListLabels();
    }
});

let totalJobsCounter = 0;
let hiddenJobsCounter = 0;

function updateBadge() {
    let badge = document.getElementById('job-filter-badge');

    // Only show badge on jobs search page
    const isSearchPage = window.location.href.includes('/jobs/search');

    if (!badge && isSearchPage) {
        badge = document.createElement('div');
        badge.id = 'job-filter-badge';
        badge.style.position = 'fixed';
        // Placed below the LinkedIn top navbar to ensure it is visible
        badge.style.top = '70px';
        badge.style.right = '20px';
        badge.style.backgroundColor = '#0a66c2';
        badge.style.color = 'white';
        badge.style.padding = '10px 15px';
        badge.style.borderRadius = '8px';
        badge.style.fontWeight = 'bold';
        badge.style.zIndex = '9999';
        badge.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        badge.style.fontFamily = 'System-ui, -apple-system, sans-serif';
        badge.style.fontSize = '14px';
        document.body.appendChild(badge);
    }

    if (badge) {
        if (isSearchPage) {
            badge.style.display = 'block';
            badge.innerText = `Jobs loaded: ${totalJobsCounter} | Hidden: ${hiddenJobsCounter} | Visible: ${totalJobsCounter - hiddenJobsCounter}`;
        } else {
            badge.style.display = 'none';
        }
    }
}

// Pre-calculate lowercased countries so we do it exactly once
const countriesLower = countriesToRemove.map(c => c.toLowerCase());

function hideJobs() {
    const jobItems = document.querySelectorAll("li.scaffold-layout__list-item");

    // Update total counter based on currently loaded elements
    totalJobsCounter = jobItems.length;
    let currentHidden = 0;

    jobItems.forEach(item => {
        // ALWAYS evaluate the job text because LinkedIn's infinite scrolling 
        // recycles list items and constantly replaces their text. 
        const itemText = item.textContent.toLowerCase();
        const shouldHide = countriesLower.some(country => itemText.includes(country));

        if (shouldHide) {
            // Force display: none to override any native LinkedIn styles
            item.style.setProperty('display', 'none', 'important');
            item.dataset.jobHidden = "true";
            currentHidden++;
        } else {
            // Clear our style in case LinkedIn recycled a previously hidden element for a good job
            item.style.removeProperty('display');
            item.dataset.jobHidden = "false";
        }
    });

    hiddenJobsCounter = currentHidden;
    updateBadge(); // Refresh UI
}

function saveCurrentJob() {
    try {
        const titleElem = document.querySelector('.job-details-jobs-unified-top-card__job-title') || document.querySelector('.jobs-unified-top-card__job-title');

        let title = 'Unknown Title';
        if (titleElem) {
            // We remove the button text if it got caught in the textContent
            title = titleElem.textContent
                .replace('📥 Save Job', '')
                .replace('✅ Saved!', '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        const linkElem = document.querySelector('.job-details-jobs-unified-top-card__job-title a') || document.querySelector('.jobs-unified-top-card__job-title a');
        let link = window.location.href;
        if (linkElem && linkElem.href) {
            link = linkElem.href;
        }

        const descriptionElem = document.querySelector('.jobs-description__content') || document.querySelector('.job-details-jobs-unified-top-card__job-description') || document.getElementById('job-details');
        let description = descriptionElem ? descriptionElem.textContent.trim() : '';

        // Remove text injected by our extension so it doesn't pollute the CSV
        description = description
            .replace('✅ English Job Description', '')
            .replace('🌍 Non-English Job Description', '')
            .replace('⚠️ Mandatory Foreign Language Required (See highlighted text below)', '');

        const recruiterElem = document.querySelector('.hirer-card__hirer-information') || document.querySelector('.jobs-poster') || document.querySelector('.job-details-jobs-unified-top-card__hirer-profile-link');
        const recruiter = recruiterElem ? recruiterElem.textContent.replace(/\s+/g, ' ').trim() : 'N/A';

        // Attempt to find recruiter link
        let recruiterLink = 'N/A';
        const hirerCard = document.querySelector('.hirer-card') || document.querySelector('.jobs-poster');
        if (hirerCard) {
            const aTag = hirerCard.querySelector('a');
            if (aTag && aTag.href && aTag.href.includes('linkedin.com/in/')) {
                recruiterLink = aTag.href.split('?')[0];
            }
        }
        if (recruiterLink === 'N/A' && recruiterElem) {
            if (recruiterElem.tagName.toUpperCase() === 'A' && recruiterElem.href) {
                recruiterLink = recruiterElem.href.split('?')[0];
            } else {
                const aTag = recruiterElem.querySelector('a');
                if (aTag && aTag.href) recruiterLink = aTag.href.split('?')[0];
            }
        }

        // Extract emails
        const emailsMatches = description.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
        const email = emailsMatches ? [...new Set(emailsMatches)].join(', ') : 'N/A';

        const rawLink = link.split('?')[0]; // simple link

        const jobObj = {
            id: Date.now(),
            title: title,
            link: rawLink,
            description: description.replace(/\r?\n|\r/g, ' ').replace(/"/g, '""'), // safe for csv
            email: email,
            recruiter: recruiter,
            recruiterLink: recruiterLink,
            dateSaved: new Date().toISOString()
        };

        chrome.storage.local.get({ saved_jobs: [] }, function (result) {
            const jobs = result.saved_jobs;
            // Prevent duplicate saves of same title/link sequence quickly
            if (jobs.length > 0 && jobs[jobs.length - 1].link === rawLink) {
                return;
            }
            jobs.push(jobObj);
            chrome.storage.local.set({ saved_jobs: jobs }, function () {
                const btns = document.querySelectorAll('.job-filter-save-btn-custom');
                btns.forEach(btn => {
                    btn.innerHTML = '✅ Saved!';
                    btn.style.backgroundColor = '#20c997';
                    setTimeout(() => {
                        btn.innerHTML = '📥 Save Job';
                        btn.style.backgroundColor = '#28a745';
                    }, 3000);
                });
            });
        });
    } catch (e) {
        console.error("LinkedIn Job Filter: Failed to save job", e);
    }
}

function addSaveButton() {
    // Find all native Save buttons on the page (usually one in header, one sticky)
    const nativeSaveButtons = document.querySelectorAll('.jobs-save-button');

    nativeSaveButtons.forEach((nativeBtn, index) => {
        const customBtnId = 'job-filter-save-btn-' + index;

        if (!document.getElementById(customBtnId)) {
            const btnContainer = document.createElement('span');
            btnContainer.style.display = 'inline-flex';
            btnContainer.style.alignItems = 'center';
            btnContainer.style.verticalAlign = 'middle';
            btnContainer.style.marginRight = '8px';
            btnContainer.style.marginLeft = '8px';

            const btn = document.createElement('button');
            btn.id = customBtnId;
            btn.className = 'job-filter-save-btn-custom';
            btn.innerHTML = '📥 Save Job';
            // Match padding visually
            btn.style.padding = '5px 12px';
            btn.style.backgroundColor = '#28a745';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '20px';
            btn.style.cursor = 'pointer';
            btn.style.fontWeight = '600';
            btn.style.fontSize = '14px';
            btn.style.lineHeight = '24px';
            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                saveCurrentJob();
            });

            // Hover effect
            btn.onmouseover = function () { btn.style.backgroundColor = '#218838'; }
            btn.onmouseout = function () { btn.style.backgroundColor = '#28a745'; }

            btnContainer.appendChild(btn);

            // Insert our button exactly before the native LinkedIn Save button
            nativeBtn.parentNode.insertBefore(btnContainer, nativeBtn);
        }
    });

    // Fallback if no native save buttons are found yet
    if (nativeSaveButtons.length === 0) {
        let targetContainer = document.querySelector('.job-details-jobs-unified-top-card__sticky-buttons-container') ||
            document.querySelector('.jobs-unified-top-card__content--two-pane .jobs-s-apply') ||
            document.querySelector('.job-details-jobs-unified-top-card__job-title')?.parentElement;

        if (targetContainer && !document.getElementById('job-filter-save-btn-fallback')) {
            const btnContainer = document.createElement('span');
            btnContainer.style.display = 'inline-flex';
            btnContainer.style.alignItems = 'center';
            btnContainer.style.verticalAlign = 'middle';
            btnContainer.style.marginRight = '8px';

            const btn = document.createElement('button');
            btn.id = 'job-filter-save-btn-fallback';
            btn.className = 'job-filter-save-btn-custom';
            btn.innerHTML = '📥 Save Job';
            btn.style.padding = '4px 12px';
            btn.style.backgroundColor = '#28a745';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '20px';
            btn.style.cursor = 'pointer';
            btn.style.fontWeight = '600';
            btn.style.fontSize = '14px';
            btn.style.lineHeight = '24px';
            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                saveCurrentJob();
            });

            // Hover effect
            btn.onmouseover = function () { btn.style.backgroundColor = '#218838'; }
            btn.onmouseout = function () { btn.style.backgroundColor = '#28a745'; }

            btnContainer.appendChild(btn);

            targetContainer.insertBefore(btnContainer, targetContainer.firstChild);
        }
    }
}

function analyzeJobDescription() {
    // Only analyze when the job details section and description is present
    const jobDetailsContainer = document.getElementById('job-details') || document.querySelector('.jobs-description__content');
    if (!jobDetailsContainer) return;

    // Check if we already analyzed this job by checking the current job URL
    let currentLink = window.location.href.split('?')[0];
    const linkElem = document.querySelector('.job-details-jobs-unified-top-card__job-title a') || document.querySelector('.jobs-unified-top-card__job-title a');
    if (linkElem && linkElem.href) {
        currentLink = linkElem.href.split('?')[0];
    }

    // We can tag the container to prevent re-analyzing the same job description
    if (jobDetailsContainer.dataset.analyzedLink === currentLink) {
        return;
    }
    jobDetailsContainer.dataset.analyzedLink = currentLink;

    const fullText = jobDetailsContainer.textContent || "";
    if (fullText.length < 50) return; // Too short to analyze safely

    // 1. Detect if it's English
    const englishWords = /\b(the|and|to|of|a|in|for|is|on|that|by|this|with|i|you|it|not|or|be|are|from|at|as|your|we)\b/gi;
    const matches = fullText.match(englishWords);
    const wordCount = fullText.split(/\s+/).length;

    // If English stop words make up less than 15% of the word count, it's NOT English.
    // (Pure English usually sits around 25-35%. The Finnish example provided sits at 5.4%).
    const isEnglish = matches && (matches.length / wordCount) > 0.15;

    // --- SPA CLEANUP ---
    // LinkedIn recycles DOM elements. We must clear old highlights before analyzing the new job text.
    const oldHighlights = jobDetailsContainer.querySelectorAll('.job-filter-highlight');
    oldHighlights.forEach(b => {
        b.style.color = '';
        b.style.fontWeight = '';
        b.style.backgroundColor = '';
        b.style.padding = '';
        b.style.borderRadius = '';
        b.classList.remove('job-filter-highlight');
    });

    // 2. Discover mandatory foreign languages
    let foundMandatoryLanguage = false;

    const langRegex = /\b(german|french|spanish|italian|dutch|swedish|norwegian|danish|finnish|polish|portuguese|russian|arabic|chinese|japanese|korean|deutsch|français|español|nederlands|svenska|norsk|suomi)\b/i;
    const reqRegex = /\b(fluent|native|proficient|proficiency|required|mandatory|must|speak|command|b2|c1|c2|mother tongue)\b/i;
    const optRegex = /\b(bonus|plus|advantage|nice to have|optional|preferred)\b/i;

    const blocks = jobDetailsContainer.querySelectorAll('p, li, div');
    blocks.forEach(block => {
        // Prevent highlighting massive parent containers if they have nested paragraph/list elements
        if (block.querySelector('p, li, ul')) return;
        // We only want to analyze leaf nodes essentially, to prevent highlighting parent divs entirely
        if (block.children.length > 2 && block.tagName === 'DIV') return;

        const text = block.textContent;
        // Don't flag English itself as a foreign mandatory language since the user wants "except than english"
        if (langRegex.test(text) && reqRegex.test(text) && !optRegex.test(text)) {
            block.style.color = '#d32f2f'; // Red color
            block.style.fontWeight = 'bold';
            block.style.backgroundColor = '#ffebee';
            block.style.padding = '2px 4px';
            block.style.borderRadius = '4px';
            block.classList.add('job-filter-highlight'); // Tag it so we can clean it up later!
            foundMandatoryLanguage = true;
        }
    });

    // 3. Inject Banner
    let bannerContainer = document.getElementById('job-filter-lang-banner');
    if (!bannerContainer) {
        bannerContainer = document.createElement('div');
        bannerContainer.id = 'job-filter-lang-banner';
        bannerContainer.style.marginBottom = '16px';
        bannerContainer.style.padding = '0';
        bannerContainer.style.borderRadius = '8px';
        bannerContainer.style.fontWeight = 'bold';
        bannerContainer.style.display = 'flex';
        bannerContainer.style.flexDirection = 'column';
        bannerContainer.style.gap = '8px';
        // Insert at the very top of the job description
        const titleAbout = jobDetailsContainer.querySelector('.jobs-description__title') || jobDetailsContainer.firstChild;
        jobDetailsContainer.insertBefore(bannerContainer, titleAbout);
    }

    bannerContainer.innerHTML = ''; // clear out old content

    // Primary Language Banner
    const langPill = document.createElement('div');
    langPill.style.padding = '8px 12px';
    langPill.style.borderRadius = '6px';
    langPill.style.color = '#fff';

    if (isEnglish) {
        langPill.style.backgroundColor = '#2e7d32'; // Green
        langPill.innerText = '✅ English Job Description';
    } else {
        langPill.style.backgroundColor = '#d32f2f'; // Red
        langPill.innerText = '🌍 Non-English Job Description';
    }
    bannerContainer.appendChild(langPill);

    // Mandatory Language Alert
    if (foundMandatoryLanguage) {
        const reqPill = document.createElement('div');
        reqPill.style.padding = '8px 12px';
        reqPill.style.borderRadius = '6px';
        reqPill.style.color = '#fff';
        reqPill.style.backgroundColor = '#d84315'; // Dark Orange/Red
        reqPill.innerText = '⚠️ Mandatory Foreign Language Required (See highlighted text below)';
        bannerContainer.appendChild(reqPill);
    }

    // --- SAVE TO PERSISTENT CACHE ---
    const matchId = currentLink.match(/\/jobs\/view\/(\d+)/) || currentLink.match(/currentJobId=(\d+)/);
    const jobId = matchId ? matchId[1] : null;

    if (jobId) {
        chrome.storage.local.get(['jobLanguageCache'], (result) => {
            const cache = result.jobLanguageCache || {};

            // Always write/update storage when job is opened to refresh timestamp and capture any edits by the recruiter
            cache[jobId] = {
                isEnglish: isEnglish,
                reqLang: foundMandatoryLanguage,
                ts: Date.now()
            };

            // GC: Clean up items older than 30 days
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            Object.keys(cache).forEach(k => {
                if (now - cache[k].ts > thirtyDaysMs) {
                    delete cache[k];
                }
            });

            chrome.storage.local.set({ jobLanguageCache: cache });
        });
    }
}

function injectListLabels() {
    if (Object.keys(inMemoryLangCache).length === 0) return;

    const jobCards = document.querySelectorAll('.job-card-container');
    jobCards.forEach(card => {
        // Find jobId either from card itself or parent wrap
        const jobId = card.dataset.jobId || (card.parentElement && card.parentElement.dataset.occludableJobId);
        if (!jobId || !inMemoryLangCache[jobId]) return;

        // Ensure we don't inject twice
        if (card.querySelector('.job-filter-list-lang-wrapper')) return;

        const data = inMemoryLangCache[jobId];

        // Find a place to append the label in the card (metadata area is usually best)
        const wrapper = card.querySelector('.job-card-container__metadata-wrapper') || card.querySelector('.artdeco-entity-lockup__caption');
        if (wrapper) {
            const labelContainer = document.createElement('div');
            labelContainer.className = 'job-filter-list-lang-wrapper';
            labelContainer.style.display = 'flex';
            labelContainer.style.gap = '6px';
            labelContainer.style.marginTop = '6px';

            if (data.isEnglish) {
                const eng = document.createElement('span');
                eng.style.backgroundColor = '#e8f5e9';
                eng.style.color = '#2e7d32';
                eng.style.padding = '2px 6px';
                eng.style.borderRadius = '4px';
                eng.style.fontSize = '12px';
                eng.style.fontWeight = 'bold';
                eng.innerText = '[EN]';
                labelContainer.appendChild(eng);
            } else {
                const nonEng = document.createElement('span');
                nonEng.style.backgroundColor = '#ffebee';
                nonEng.style.color = '#d32f2f';
                nonEng.style.padding = '2px 6px';
                nonEng.style.borderRadius = '4px';
                nonEng.style.fontSize = '12px';
                nonEng.style.fontWeight = 'bold';
                nonEng.innerText = '[Non-EN]';
                labelContainer.appendChild(nonEng);
            }

            if (data.reqLang) {
                const req = document.createElement('span');
                req.style.backgroundColor = '#fff3e0';
                req.style.color = '#e65100';
                req.style.padding = '2px 6px';
                req.style.borderRadius = '4px';
                req.style.fontSize = '12px';
                req.style.fontWeight = 'bold';
                req.innerText = '[Req. Lang]';
                labelContainer.appendChild(req);
            }

            wrapper.appendChild(labelContainer);
        }
    });
}

// Initial run
hideJobs();
addSaveButton();
analyzeJobDescription();
injectListLabels();

let debounceTimer;

// Setup MutationObserver to watch for newly loaded jobs as the user scrolls
const observer = new MutationObserver((mutations) => {
    let newJobsAdded = false;
    for (const mutation of mutations) {
        // Ignore mutations caused by our own UI injections
        if (mutation.target.id === 'job-filter-badge' ||
            (mutation.target.parentElement && mutation.target.parentElement.id === 'job-filter-badge') ||
            (mutation.target.className && typeof mutation.target.className === 'string' && mutation.target.className.includes('job-filter-list-lang-wrapper'))) {
            continue;
        }

        // Check if any actual element was added (not just text nodes)
        let hasElementAdded = false;
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && node.id !== 'job-filter-badge') { // Node.ELEMENT_NODE is 1
                hasElementAdded = true;
                break;
            }
        }

        if (hasElementAdded) {
            newJobsAdded = true;
            break;
        }
    }

    if (newJobsAdded) {
        // Clear previous timer and set a new one to prevent running too many times
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Temporarily disconnect to avoid our own DOM changes triggering the observer
            observer.disconnect();
            hideJobs();
            addSaveButton();
            analyzeJobDescription();
            injectListLabels();
            // Reconnect the observer
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }, 500);
    }
});

// Start observing the document body for changes
observer.observe(document.body, {
    childList: true,
    subtree: true
});
