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

function hideJobs() {
    const jobItems = document.querySelectorAll("div.scaffold-layout__list > div > ul > li");

    jobItems.forEach(item => {
        // Skip if we already processed and hid this item to improve performance
        if (item.dataset.jobHidden === "true") return;

        let shouldHide = false;

        // Convert the text content to lowercase for case-insensitive matching, if needed,
        // however the user exactly specified the list with specific casing.
        const itemText = item.textContent;

        countriesToRemove.forEach(country => {
            if (itemText.includes(country)) {
                shouldHide = true;
            }
        });

        if (shouldHide) {
            item.style.display = 'none';
            // Mark the item so we don't process it again
            item.dataset.jobHidden = "true";
        }
    });
}

// Initial run
hideJobs();

// Setup MutationObserver to watch for newly loaded jobs as the user scrolls
const observer = new MutationObserver((mutations) => {
    let newJobsAdded = false;
    for (const mutation of mutations) {
        // If nodes were added, it might be new jobs loading in
        if (mutation.addedNodes.length > 0) {
            newJobsAdded = true;
            break;
        }
    }

    if (newJobsAdded) {
        hideJobs();
    }
});

// Start observing the document body for changes
observer.observe(document.body, {
    childList: true,
    subtree: true
});
