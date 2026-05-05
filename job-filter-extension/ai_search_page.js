(function () {
    'use strict';
    const countriesToRemove = [
        "Lithuania","Vilnius","Kaunas","Klaipeda","Siauliai","Panevezys",
        "Romania","Bucharest","Cluj","Cluj-Napoca","Timisoara","Iasi","Constanta","Brasov","Transylvania",
        "France","Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Strasbourg","Montpellier","Bordeaux","Lille","Ile-de-France",
        "Ukraine","Kyiv","Kiev","Kharkiv","Odesa","Odessa","Dnipro","Lviv","Zaporizhzhia","Donetsk",
        "Italy","Rome","Milan","Naples","Turin","Palermo","Genoa","Bologna","Florence","Venice","Lombardy","Lazio","Campania",
        "Poland","Warsaw","Krakow","Cracow","Lodz","Wroclaw","Poznan","Gdansk","Szczecin","Bydgoszcz","Lublin","Silesia","Pomerania",
        "Portugal","Lisbon","Porto","Amadora","Braga","Algarve","Madeira","Azores","Coimbra",
        "Estonia","Tallinn","Tartu","Narva","Parnu",
        "Bulgaria","Sofia","Plovdiv","Varna","Burgas","Ruse",
        "Latvia","Riga","Daugavpils","Liepaja","Jelgava",
        "Slovakia","Bratislava","Kosice","Presov","Zilina",
        "Slovenia","Ljubljana","Maribor","Celje","Kranj",
        "Hungary","Budapest","Debrecen","Szeged","Miskolc","Pecs","Gyor",
        "Croatia","Zagreb","Split","Rijeka","Osijek","Zadar","Dalmatia",
        "Greece","Athens","Thessaloniki","Patras","Heraklion","Crete","Peloponnese","Larissa",
        "Cyprus","Nicosia","Limassol","Larnaca","Paphos",
        "Malta","Valletta","Birkirkara","Mosta","Sliema",
        "Belarus","Minsk","Gomel","Vitebsk","Mogilev","Grodno","Brest",
        "Moldova","Chisinau","Tiraspol","Balti","Bender",
        "Serbia","Belgrade","Novi Sad","Nis","Kragujevac","Vojvodina",
        "Bosnia","Bosnia and Herzegovina","Sarajevo","Banja Luka","Tuzla","Zenica","Mostar",
        "Albania","Tirana","Durres","Vlore","Elbasan","Shkoder",
        "Montenegro","Podgorica","Niksic","Budva","Kotor",
        "North Macedonia","Skopje","Bitola","Kumanovo","Prilep",
        "Kosovo","Pristina","Prizren","Ferizaj","Peja",
        "Czechia","Czech Republic","Prague","Brno","Ostrava","Plzen","Liberec","Olomouc","Bohemia","Moravia",
        "Spain","Madrid","Barcelona","Valencia","Seville","Zaragoza","Malaga","Murcia","Palma","Catalonia","Andalusia","Galicia","Basque Country","Bilbao",
        "England","London","Manchester","Birmingham","Liverpool","Leeds","Sheffield","Bristol","Newcastle",
    ];
    const countriesLower = countriesToRemove.map(c => c.toLowerCase());

    let inMemoryLangCache = {};
    let extensionValid = true;

    function safe(fn) {
        try { fn(); } catch (e) {
            if (e.message && e.message.includes('Extension context invalidated')) {
                extensionValid = false;
            } else { throw e; }
        }
    }

    safe(() => {
        chrome.storage.local.get(['jobLanguageCache'], r => {
            if (r.jobLanguageCache) { inMemoryLangCache = r.jobLanguageCache; injectListLabelsAI(); }
        });
        chrome.storage.onChanged.addListener((changes, ns) => {
            if (ns === 'local' && changes.jobLanguageCache) {
                inMemoryLangCache = changes.jobLanguageCache.newValue || {};
                injectListLabelsAI();
            }
        });
    });

    // ── Helpers ────────────────────────────────────────────────────────────────
    let totalJobsAI = 0, hiddenJobsAI = 0;

    function updateBadgeAI() {
        let b = document.getElementById('job-filter-badge-ai');
        if (!b) {
            b = document.createElement('div');
            b.id = 'job-filter-badge-ai';
            Object.assign(b.style, {
                position:'fixed', top:'70px', right:'20px', backgroundColor:'#0a66c2',
                color:'white', padding:'10px 15px', borderRadius:'8px', fontWeight:'bold',
                zIndex:'9999', boxShadow:'0 4px 6px rgba(0,0,0,0.1)',
                fontFamily:'system-ui,sans-serif', fontSize:'14px'
            });
            document.body.appendChild(b);
        }
        b.innerText = `Jobs: ${totalJobsAI} | Hidden: ${hiddenJobsAI} | Visible: ${totalJobsAI - hiddenJobsAI}`;
    }

    function getCurrentJobId() {
        try { return new URL(window.location.href).searchParams.get('currentJobId'); }
        catch(e) { return null; }
    }

    function approxPostedTs(str) {
        if (!str) return null;
        const m = str.toLowerCase().match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
        if (!m) return null;
        const ms = {second:1e3,minute:6e4,hour:36e5,day:864e5,week:6048e5,month:2592e6,year:31536e6};
        return Date.now() - parseInt(m[1]) * ms[m[2]];
    }

    // ── List: get job card wrappers from left pane ─────────────────────────────
    function getListColumn() {
        // The FIRST lazy-column with componentkey="SearchResultsMainContent" is the list
        return document.querySelector('[data-testid="lazy-column"][componentkey="SearchResultsMainContent"]')
            || document.querySelector('[data-testid="lazy-column"]');
    }
    function getJobCardWrappers() {
        const col = getListColumn();
        if (!col) return [];
        return Array.from(col.children).filter(el => el.tagName === 'DIV');
    }

    // ── List: Hide jobs ───────────────────────────────────────────────────────
    function hideJobsAI() {
        if (!extensionValid) return;
        const cards = getJobCardWrappers();
        totalJobsAI = cards.length;
        let hidden = 0;
        safe(() => {
            chrome.storage.local.get({ hideViewed: false, hideApplied: false }, settings => {
                cards.forEach(card => {
                    const txt = card.textContent.toLowerCase();
                    let hide = countriesLower.some(c => txt.includes(c));
                    if (!hide && settings.hideViewed)
                        hide = [...card.querySelectorAll('p')].some(p => p.textContent.trim().toLowerCase() === 'viewed');
                    if (!hide && settings.hideApplied)
                        hide = [...card.querySelectorAll('p')].some(p => p.textContent.trim().toLowerCase() === 'applied');
                    if (hide) {
                        card.style.setProperty('display','none','important');
                        card.dataset.aiJobHidden = 'true';
                        const hr = card.nextElementSibling;
                        if (hr && hr.tagName === 'HR') hr.style.setProperty('display','none','important');
                        hidden++;
                    } else {
                        card.style.removeProperty('display');
                        card.dataset.aiJobHidden = 'false';
                        const hr = card.nextElementSibling;
                        if (hr && hr.tagName === 'HR') hr.style.removeProperty('display');
                    }
                });
                hiddenJobsAI = hidden;
                updateBadgeAI();
            });
        });
    }

    // ── List: Inject cached labels ────────────────────────────────────────────
    function injectListLabelsAI() {
        if (!Object.keys(inMemoryLangCache).length) return;
        const titleToId = {};
        Object.entries(inMemoryLangCache).forEach(([id, d]) => {
            if (d.title) titleToId[d.title.toLowerCase().replace(/\s+/g,' ').trim()] = id;
        });
        getJobCardWrappers().forEach(card => {
            if (card.dataset.aiJobHidden === 'true') return;
            if (card.querySelector('.job-filter-ai-lbl')) return;

            // Try to find jobId from card links first (most reliable)
            let jid = null;
            const links = card.querySelectorAll('a[href*="currentJobId="]');
            for (const link of links) {
                const m = link.href.match(/currentJobId=(\d+)/);
                if (m && inMemoryLangCache[m[1]]) { jid = m[1]; break; }
            }
            // Also try /jobs/view/ID/ links
            if (!jid) {
                const viewLinks = card.querySelectorAll('a[href*="/jobs/view/"]');
                for (const link of viewLinks) {
                    const m = link.href.match(/\/jobs\/view\/(\d+)/);
                    if (m && inMemoryLangCache[m[1]]) { jid = m[1]; break; }
                }
            }
            // Fallback: title matching
            if (!jid) {
                const span = card.querySelector('span.de4f078c');
                const key = span ? span.textContent.toLowerCase().replace(/\s+/g,' ').trim() : '';
                if (key) {
                    jid = titleToId[key];
                    if (!jid && key.length > 10) {
                        const pk = Object.keys(titleToId).find(k => k.startsWith(key.slice(0,25)));
                        if (pk) jid = titleToId[pk];
                    }
                }
            }
            if (!jid) return;
            const d = inMemoryLangCache[jid];
            if (!d || typeof d.isEnglish === 'undefined') return;

            // Find a suitable anchor element to append the label row
            let anchor = (card.querySelector('p.b33de5eb') || {}).parentElement;
            if (!anchor) {
                // Fallback: find the last <p> in the card's top area
                const allP = card.querySelectorAll('p');
                for (const p of allP) {
                    if (p.textContent.includes('\u2022') || p.textContent.includes('\u00b7')) {
                        anchor = p.parentElement; break;
                    }
                }
            }
            if (!anchor) {
                // Last resort: just append to the card itself
                anchor = card;
            }

            const row = document.createElement('div');
            row.className = 'job-filter-ai-lbl';
            row.style.cssText = 'display:flex;gap:5px;margin-top:4px;flex-wrap:wrap;';
            const tag = (t,bg,fg) => { const s=document.createElement('span'); s.style.cssText=`background:${bg};color:${fg};padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;`; s.innerText=t; return s; };
            row.appendChild(d.isEnglish ? tag('[EN]','#e8f5e9','#2e7d32') : tag('[Non-EN]','#ffebee','#d32f2f'));
            if (d.reqLang) row.appendChild(tag('[Req. Lang]','#fff3e0','#e65100'));
            if (d.noSponsorship) {
                row.appendChild(tag('[No Visa]','#b71c1c','#fff'));
                const inner = card.querySelector('div.abcc1c89');
                if (inner) inner.style.setProperty('background-color','#ffebee','important');
            } else if (d.isEnglish && !d.reqLang) {
                const inner = card.querySelector('div.abcc1c89');
                if (inner) inner.style.setProperty('background-color','#e8f5e9','important');
            }
            anchor.appendChild(row);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DETAIL PANE — uses AI-search-specific selectors
    // ═══════════════════════════════════════════════════════════════════════════

    /** The detail pane container */
    function getDetailPane() {
        return document.querySelector('[data-sdui-screen*="SemanticJobDetails"]');
    }

    /** Job description text box — ONLY inside the "About the job" section */
    function getDescriptionEls() {
        const pane = getDetailPane();
        if (!pane) return [];
        // The job description lives inside [componentkey^="JobDetails_AboutTheJob_"]
        const aboutSection = pane.querySelector('[componentkey^="JobDetails_AboutTheJob_"]');
        if (aboutSection) {
            return Array.from(aboutSection.querySelectorAll('[data-testid="expandable-text-box"]'));
        }
        // Fallback: first expandable-text-box only
        const first = pane.querySelector('[data-testid="expandable-text-box"]');
        return first ? [first] : [];
    }

    /** Full description text */
    function getDescriptionText() {
        return getDescriptionEls().map(el => el.textContent).join('\n');
    }

    /** Title link — the <a> tag pointing to /jobs/view/ID/ inside the detail pane */
    function getDetailTitleEl() {
        const pane = getDetailPane();
        if (!pane) return null;
        return pane.querySelector('a[href*="/jobs/view/"]');
    }

    /** Extract job ID from the title link href */
    function getDetailJobId() {
        const a = getDetailTitleEl();
        if (a) {
            const m = a.href.match(/\/jobs\/view\/(\d+)/);
            if (m) return m[1];
        }
        return getCurrentJobId();
    }

    /** Company name from aria-label="Company, Fortnox." */
    function getCompanyName() {
        const pane = getDetailPane();
        if (!pane) return 'Unknown';
        const el = pane.querySelector('div[aria-label^="Company,"]');
        if (el) {
            const m = el.getAttribute('aria-label').match(/^Company,\s*(.+)\.?$/);
            if (m) return m[1].replace(/\.$/, '').trim();
        }
        // Fallback: look for link to /company/ page
        const compLink = pane.querySelector('a[href*="/company/"] p a');
        if (compLink) return compLink.textContent.trim();
        return 'Unknown';
    }

    /** Location from the metadata paragraph containing span.a219e9ac */
    function getLocation() {
        const pane = getDetailPane();
        if (!pane) return 'N/A';
        // The metadata line has: <span class="a219e9ac">Location</span> · <span>time ago</span> · <span>applicants</span>
        // Find all paragraphs that contain a219e9ac spans AND a middle-dot separator
        const paragraphs = pane.querySelectorAll('p');
        for (const p of paragraphs) {
            const txt = p.textContent;
            if (txt.includes('\u00b7') || txt.includes('·')) { // middle dot
                const locSpan = p.querySelector('span.a219e9ac');
                if (locSpan) {
                    const loc = locSpan.textContent.trim();
                    // Make sure it's actually a location (not "91 people clicked apply")
                    if (loc && !/\d+\s+(people|applicant)/i.test(loc) && !/promoted/i.test(loc)) {
                        return loc;
                    }
                }
            }
        }
        return 'N/A';
    }

    /** Get time-ago from span._60fd72d3 (contains "Reposted 21 hours ago" etc.) */
    function getDetailTimeAgo() {
        const pane = getDetailPane();
        if (!pane) return null;
        // Time ago is inside <span class="_60fd72d3"><strong>Reposted 21 hours ago</strong></span>
        const timeSpan = pane.querySelector('span._60fd72d3');
        if (timeSpan) {
            const m = timeSpan.textContent.match(/((?:reposted\s+)?\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago)/i);
            if (m) return m[1];
        }
        // Fallback: scan all paragraphs
        const timeP = /((?:reposted\s+)?\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago)/i;
        for (const p of pane.querySelectorAll('p')) {
            const m = p.textContent.match(timeP);
            if (m) return m[1];
        }
        return null;
    }

    // ── Visa/Sponsorship patterns ─────────────────────────────────────────────
    const NO_VISA = [
        /\bno\s+(visa\s+)?sponsorship\b/i,
        /\b(not\s+(able|willing|providing|provide)|unable)\s+(to\s+)?(offer\s+|provide\s+)?(sponsor|visa|sponsorship)\b/i,
        /\bcannot\s+sponsor\b/i,
        /\b(can\s?not|cannot|can't|do\s+not|don't)\s+(provide|offer|support|sponsor)\s+(visa|sponsorship)?\b/i,
        /\bwithout\s+(visa\s+)?sponsorship\b/i,
        /\bmust\s+(be|have)\s+(legally\s+)?(authorized|eligible|entitled)\s+to\s+work\b/i,
        /\bmust\s+have\s+(the\s+)?(legal\s+)?right\s+to\s+work\b/i,
        /\brequire[sd]?\s+(eu|eea|european|uk|us)\s+(citizenship|residency|work\s*(permit|authorization|visa))\b/i,
        /\b(eu|eea|european)\s+(citizen(ship)?|national(ity)?|passport)\s+(required|only|necessary|needed|must)\b/i,
        /\bmust\s+(already\s+)?(hold|have|possess)\s+a\s+(valid\s+)?(work\s*)?(permit|visa|authorization)\b/i,
        /\bwork\s+permit\s+(is\s+)?required\b/i,
        /\beligib(le|ility)\s+to\s+work\s+(in\s+)?(the\s+)?(eu|eea|uk|us|europe)\b/i,
        /\bno\s+relocation\s+(assistance|support|package)\b/i,
        /\bgeen\s+(visumsponsoring|kennismigrantenregeling)\b/i,
    ];

    // ── Detail: Analyze job description ───────────────────────────────────────
    function analyzeJobDescriptionAI() {
        const jobId = getDetailJobId();
        if (!jobId) return;

        const descEls = getDescriptionEls();
        if (!descEls.length) return;

        // Remove old banner
        const old = document.getElementById('job-filter-lang-banner-ai');
        if (old) old.remove();

        let fullText = getDescriptionText();
        // Strip our own injections
        fullText = fullText.replace(/[✅🌍⚠️🚫].+?(Description|Required|permit)/g, '');
        if (fullText.length < 50) return;

        // English detection
        const engWords = fullText.match(/\b(the|and|to|of|a|in|for|is|on|that|by|this|with|i|you|it|not|or|be|are|from|at|as|your|we)\b/gi);
        const wordCount = fullText.split(/\s+/).length;
        const isEnglish = engWords && (engWords.length / wordCount) > 0.15;

        const noSponsorship = NO_VISA.some(p => p.test(fullText));

        // Clean old highlights
        descEls.forEach(el => {
            el.querySelectorAll('.job-filter-highlight').forEach(b => {
                b.style.color = ''; b.style.fontWeight = ''; b.style.backgroundColor = '';
                b.style.padding = ''; b.style.borderRadius = '';
                b.classList.remove('job-filter-highlight');
            });
        });

        // Language requirement detection
        const langR = /\b(german|french|spanish|italian|dutch|swedish|norwegian|danish|finnish|polish|portuguese|russian|arabic|chinese|japanese|korean|deutsch|fran[cç]ais|espa[nñ]ol|nederlands|svenska|norsk|suomi)\b/i;
        const reqR = /\b(fluent|native|proficient|proficiency|required|mandatory|must|speak|command|b2|c1|c2|mother tongue)\b/i;
        const optR = /\b(bonus|plus|advantage|nice to have|optional|preferred)\b/i;
        let foundReqLang = false;

        descEls.forEach(el => {
            el.querySelectorAll('p, li, div, span').forEach(block => {
                if (block.querySelector('p, li, ul')) return;
                const t = block.textContent;
                if (langR.test(t) && reqR.test(t) && !optR.test(t)) {
                    block.style.color = '#d32f2f'; block.style.fontWeight = 'bold';
                    block.style.backgroundColor = '#ffebee'; block.style.padding = '2px 4px';
                    block.style.borderRadius = '4px'; block.classList.add('job-filter-highlight');
                    foundReqLang = true;
                }
                if (NO_VISA.some(p => p.test(t))) {
                    block.style.color = '#e65100'; block.style.fontWeight = 'bold';
                    block.style.backgroundColor = '#fff3e0'; block.style.padding = '2px 4px';
                    block.style.borderRadius = '4px'; block.classList.add('job-filter-highlight');
                }
            });
        });

        // Inject banner ABOVE first description element
        const banner = document.createElement('div');
        banner.id = 'job-filter-lang-banner-ai';
        banner.style.cssText = 'margin-bottom:12px;display:flex;flex-direction:column;gap:8px;';
        const pill = (text, bg) => {
            const d = document.createElement('div');
            d.style.cssText = `padding:8px 12px;border-radius:6px;color:#fff;background:${bg};font-weight:bold;font-size:14px;`;
            d.innerText = text; return d;
        };
        banner.appendChild(isEnglish
            ? pill('✅ English Job Description', '#2e7d32')
            : pill('🌍 Non-English Job Description', '#d32f2f'));
        if (foundReqLang) banner.appendChild(pill('⚠️ Mandatory Foreign Language Required', '#d84315'));
        if (noSponsorship) banner.appendChild(pill('🚫 No Visa Sponsorship / Must have work permit', '#b71c1c'));

        const firstDesc = descEls[0];
        if (firstDesc && firstDesc.parentElement) {
            firstDesc.parentElement.insertBefore(banner, firstDesc);
        }

        // Save to cache
        const titleEl = getDetailTitleEl();
        const title = titleEl ? titleEl.textContent.trim() : 'Unknown Title';
        const cleanLink = 'https://www.linkedin.com/jobs/view/' + jobId + '/';
        const companyName = getCompanyName();
        const location = getLocation();
        const timeAgo = getDetailTimeAgo();

        // Skip caching viewed jobs from blocked countries (saves are handled separately)
        if (countriesLower.some(c => location.toLowerCase().includes(c))) return;

        safe(() => {
            chrome.storage.local.get(['jobLanguageCache'], result => {
                const cache = result.jobLanguageCache || {};
                cache[jobId] = {
                    isEnglish, reqLang: foundReqLang, noSponsorship,
                    title, companyName: companyName,
                    link: cleanLink, location: location,
                    postedTs: approxPostedTs(timeAgo),
                    postedLabel: timeAgo && /^reposted/i.test(timeAgo) ? 'Reposted' : 'Posted',
                    ts: Date.now()
                };
                chrome.storage.local.set({ jobLanguageCache: cache }, () => {
                    inMemoryLangCache[jobId] = cache[jobId];
                    injectListLabelsAI();
                });
            });
        });
    }

    // ── Detail: Save job ──────────────────────────────────────────────────────
    function saveCurrentJobAI() {
        try {
            const jobId = getDetailJobId();
            if (!jobId) return;
            const cleanLink = 'https://www.linkedin.com/jobs/view/' + jobId + '/';
            const descText = getDescriptionText()
                .replace(/[✅🌍⚠️🚫].+?(Description|Required|permit)/g, '');
            if (!descText) return;

            const pane = getDetailPane();
            let recruiter = 'N/A', recruiterLink = 'N/A';
            if (pane) {
                // Look for profile links in the detail pane
                const profileLinks = pane.querySelectorAll('a[href*="linkedin.com/in/"]');
                if (profileLinks.length) {
                    recruiterLink = profileLinks[0].href.split('?')[0];
                    recruiter = profileLinks[0].textContent.replace(/\s+/g,' ').trim() || 'N/A';
                }
            }
            const emails = descText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
            const email = emails ? [...new Set(emails)].join(', ') : 'N/A';

            safe(() => {
                chrome.storage.local.get(['jobLanguageCache'], result => {
                    const cache = result.jobLanguageCache || {};
                    const existing = cache[jobId] || {};

                    // If this job wasn't previously analyzed (e.g. blocked country),
                    // gather all metadata now so the saved entry is complete
                    let metadata = {};
                    if (!existing.title || existing.title === 'Unknown Title') {
                        const titleEl = getDetailTitleEl();
                        const title = titleEl ? titleEl.textContent.trim() : 'Unknown Title';
                        const companyName = getCompanyName();
                        const location = getLocation();
                        const timeAgo = getDetailTimeAgo();
                        const engWords = descText.match(/\b(the|and|to|of|a|in|for|is|on|that|by|this|with|i|you|it|not|or|be|are|from|at|as|your|we)\b/gi);
                        const wordCount = descText.split(/\s+/).length;
                        const isEnglish = engWords && (engWords.length / wordCount) > 0.15;
                        metadata = {
                            title, companyName, location, isEnglish,
                            link: cleanLink,
                            postedTs: approxPostedTs(timeAgo),
                            postedLabel: timeAgo && /^reposted/i.test(timeAgo) ? 'Reposted' : 'Posted',
                            ts: Date.now()
                        };
                    }

                    cache[jobId] = {
                        ...metadata,
                        ...existing,
                        saved: true, email, recruiter, recruiterLink,
                        description: descText.replace(/\r?\n|\r/g,' ').replace(/"/g,'""'),
                        dateSaved: new Date().toISOString(), link: cleanLink
                    };
                    chrome.storage.local.set({ jobLanguageCache: cache }, () => {
                        document.querySelectorAll('.job-filter-save-btn-ai').forEach(btn => {
                            btn.innerHTML = '✅ Saved!'; btn.style.backgroundColor = '#20c997';
                            setTimeout(() => { btn.innerHTML = '📥 Save Job'; btn.style.backgroundColor = '#28a745'; }, 3000);
                        });
                    });
                });
            });
        } catch (e) { console.error('[AI Search] Save failed', e); }
    }

    // ── Detail: Add save button next to ALL "Save the job" buttons ─────────────
    function addSaveButtonAI() {
        // Find ALL native save buttons (top header + sticky bottom bar)
        const nativeSaves = document.querySelectorAll('button[aria-label="Save the job"]');
        if (!nativeSaves.length) return;

        nativeSaves.forEach(nativeSave => {
            // Walk up to find the flex container holding this button
            const parentDiv = nativeSave.closest('div.ff56cc14') || nativeSave.parentElement;
            if (!parentDiv || !parentDiv.parentElement) return;
            // Check if we already added one near this specific save button
            if (parentDiv.parentElement.querySelector('.job-filter-save-btn-ai-wrap')) return;

            const wrap = document.createElement('div');
            wrap.className = 'job-filter-save-btn-ai-wrap ff56cc14 _6764c20f e080ef7b';
            wrap.style.cssText = 'display:inline-flex;align-items:center;';
            const btn = document.createElement('button');
            btn.className = 'job-filter-save-btn-ai';
            btn.innerHTML = '📥 Save Job';
            btn.style.cssText = 'padding:5px 12px;background-color:#28a745;color:#fff;border:none;border-radius:20px;cursor:pointer;font-weight:600;font-size:14px;line-height:24px;box-shadow:0 1px 3px rgba(0,0,0,0.2);';
            btn.onmouseover = () => { btn.style.backgroundColor = '#218838'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#28a745'; };
            btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); saveCurrentJobAI(); });
            wrap.appendChild(btn);

            // Insert BEFORE the save button's container (so it appears to the left of Save)
            parentDiv.parentElement.insertBefore(wrap, parentDiv);
        });
    }

    // ── Detail pane trigger ───────────────────────────────────────────────────
    let lastJobId = null;

    function runDetailPane() {
        const jobId = getDetailJobId() || getCurrentJobId();
        if (!jobId || jobId === lastJobId) return;
        lastJobId = jobId;

        let attempts = 0;
        const wait = setInterval(() => {
            attempts++;
            const descEls = getDescriptionEls();
            if (descEls.length || attempts > 25) {
                clearInterval(wait);
                if (descEls.length) {
                    analyzeJobDescriptionAI();
                    addSaveButtonAI();
                }
            }
        }, 300);
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    function init() {
        const col = getListColumn();
        if (!col) { setTimeout(init, 400); return; }

        hideJobsAI();
        injectListLabelsAI();
        runDetailPane();

        let debounce;
        const obs = new MutationObserver(muts => {
            let hasNew = false;
            for (const m of muts) {
                if (m.target.id === 'job-filter-badge-ai') continue;
                if (m.target.classList && m.target.classList.contains('job-filter-ai-lbl')) continue;
                if (m.target.classList && m.target.classList.contains('job-filter-save-btn-ai-wrap')) continue;
                for (const n of m.addedNodes) {
                    if (n.nodeType === 1 && n.id !== 'job-filter-badge-ai'
                        && !n.classList?.contains('job-filter-save-btn-ai-wrap')
                        && !n.classList?.contains('job-filter-ai-lbl')) {
                        hasNew = true; break;
                    }
                }
                if (hasNew) break;
            }
            if (hasNew) {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    obs.disconnect();
                    hideJobsAI();
                    injectListLabelsAI();
                    // Re-add save buttons (sticky header may have appeared)
                    addSaveButtonAI();
                    // Check if detail pane changed
                    const curId = getDetailJobId() || getCurrentJobId();
                    if (curId && curId !== lastJobId) runDetailPane();
                    obs.observe(document.body, { childList: true, subtree: true });
                }, 300);
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });

        // URL polling for card clicks
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                runDetailPane();
            }
        }, 300);
    }

    safe(() => {
        chrome.runtime.onMessage.addListener(msg => {
            if (msg.action === 'refreshHideJobs') hideJobsAI();
        });
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
