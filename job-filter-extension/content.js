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

let totalJobsCounter = 0;
let hiddenJobsCounter = 0;

function updateBadge() {
    let badge = document.getElementById('job-filter-badge');
    if (!badge) {
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
    badge.innerText = `Jobs loaded: ${totalJobsCounter} | Hidden: ${hiddenJobsCounter} | Visible: ${totalJobsCounter - hiddenJobsCounter}`;
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
                .replace('📥 Save Job (CSV)', '')
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
        const description = descriptionElem ? descriptionElem.textContent.trim() : '';

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

        chrome.storage.local.get({ saved_jobs: [] }, function(result) {
            const jobs = result.saved_jobs;
            // Prevent duplicate saves of same title/link sequence quickly
            if (jobs.length > 0 && jobs[jobs.length - 1].link === rawLink) {
                return;
            }
            jobs.push(jobObj);
            chrome.storage.local.set({ saved_jobs: jobs }, function() {
                const btn = document.getElementById('job-filter-save-btn');
                if (btn) {
                    btn.innerHTML = '✅ Saved!';
                    btn.style.backgroundColor = '#20c997';
                    setTimeout(() => {
                        btn.innerHTML = '📥 Save Job (CSV)';
                        btn.style.backgroundColor = '#28a745';
                    }, 3000);
                }
            });
        });
    } catch (e) {
        console.error("LinkedIn Job Filter: Failed to save job", e);
    }
}

function addSaveButton() {
    const titleElem = document.querySelector('.job-details-jobs-unified-top-card__job-title') || document.querySelector('.jobs-unified-top-card__job-title');
    if (titleElem && !document.getElementById('job-filter-save-btn')) {
        const btnContainer = document.createElement('span');
        btnContainer.style.display = 'inline-block';
        btnContainer.style.verticalAlign = 'middle';

        const btn = document.createElement('button');
        btn.id = 'job-filter-save-btn';
        btn.innerHTML = '📥 Save Job (CSV)';
        btn.style.marginLeft = '12px';
        btn.style.padding = '4px 12px';
        btn.style.backgroundColor = '#28a745';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '20px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '14px';
        btn.style.lineHeight = '20px';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            saveCurrentJob();
        });

        // Hover effect
        btn.onmouseover = function() { btn.style.backgroundColor = '#218838'; }
        btn.onmouseout = function() { btn.style.backgroundColor = '#28a745'; }

        btnContainer.appendChild(btn);
        titleElem.appendChild(btnContainer);
    }
}

// Initial run
hideJobs();
addSaveButton();

let debounceTimer;

// Setup MutationObserver to watch for newly loaded jobs as the user scrolls
const observer = new MutationObserver((mutations) => {
    let newJobsAdded = false;
    for (const mutation of mutations) {
        // Ignore mutations caused by our own badge
        if (mutation.target.id === 'job-filter-badge' ||
            (mutation.target.parentElement && mutation.target.parentElement.id === 'job-filter-badge')) {
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
