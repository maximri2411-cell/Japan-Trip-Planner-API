let allLocations = []; // משתנה גלובלי לשמירת כל הנתונים

async function fetchLocations() {
    try {
        const response = await fetch('http://127.0.0.1:5000/locations/all');
        allLocations = await response.json();
        renderFilters(); // יצירת כפתורי הערים
        displayLocations(allLocations); // הצגת כל המקומות
    } catch (error) {
        console.error("Error:", error);
    }
}

function displayLocations(locations) {
    const container = document.getElementById('locations-container');
    container.innerHTML = '';
    
    locations.forEach(loc => {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.style = "background:white; padding:20px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05);";
        card.innerHTML = `
            <h3 style="color:#bc002d;">${loc.name}</h3>
            <p style="font-size:0.8rem; color:#999;">${loc.city}</p>
            <p>${loc.description || ''}</p>
            <a href="${loc.map_url}" target="_blank" class="map-btn" style="display:block; text-align:center; margin-top:10px; text-decoration:none;">📍 View Map</a>
        `;
        container.appendChild(card);
    });
}

// פונקציית הסינון
function renderFilters() {
    const filterContainer = document.getElementById('city-filters');
    const cities = ['all', ...new Set(allLocations.map(l => l.city))];
    
    filterContainer.innerHTML = '';
    cities.forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerText = city.charAt(0).toUpperCase() + city.slice(1);
        btn.onclick = () => {
            // עיצוב כפתור פעיל
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // סינון הנתונים
            const filtered = city === 'all' ? allLocations : allLocations.filter(l => l.city === city);
            displayLocations(filtered);
        };
        filterContainer.appendChild(btn);
    });
}

// גלילה חלקה לכפתורים
document.getElementById('explore-btn').onclick = () => document.getElementById('locations-grid').scrollIntoView({behavior:'smooth'});
document.getElementById('add-new-btn').onclick = () => document.getElementById('add-section').scrollIntoView({behavior:'smooth'});
document.getElementById('tips-btn').onclick = () => document.getElementById('tips-section').scrollIntoView({behavior:'smooth'});

window.onload = fetchLocations;