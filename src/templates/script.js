let allLocations = [];

const addModal = document.getElementById("location-modal");
const detailsModal = document.getElementById("details-modal");

// פתיחת/סגירת מודאלים
document.getElementById("open-modal-btn").onclick = () => addModal.style.display = "block";
document.querySelector(".close-modal").onclick = () => addModal.style.display = "none";
document.querySelector(".close-details").onclick = () => detailsModal.style.display = "none";

// כפתורי ה-Hero (גלילה חלקה)
document.getElementById('explore-btn').onclick = () => document.getElementById('locations-grid').scrollIntoView({ behavior: 'smooth' });
document.getElementById('tips-btn').onclick = () => document.getElementById('tips-section').scrollIntoView({ behavior: 'smooth' });

window.onclick = (e) => {
    if (e.target == addModal) addModal.style.display = "none";
    if (e.target == detailsModal) detailsModal.style.display = "none";
}

async function fetchLocations() {
    try {
        const response = await fetch('http://127.0.0.1:5000/locations/all');
        allLocations = await response.json();
        renderFilters();
        displayLocations(allLocations);
    } catch (error) { console.error("Error fetching locations"); }
}

function displayLocations(locations) {
    const container = document.getElementById('locations-container');
    container.innerHTML = '';
    
    locations.forEach(loc => {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => showDetails(loc);
        
        // תיקון: אם אין תמונה ב-DB, שמים ריבוע אפור עם טקסט במקום את תמונת ה-Hero
        const imgUrl = (loc.image_url && loc.image_url.trim() !== "") 
            ? loc.image_url 
            : "https://via.placeholder.com/400x250?text=No+Image+Added";
        
        card.innerHTML = `
            <img src="${imgUrl}" class="card-img-mini" onerror="this.src='https://via.placeholder.com/400x250?text=Image+Error'">
            <div class="card-text">
                <h3 style="color:#bc002d;">${loc.name}</h3>
                <p style="font-size:0.9rem; color:#888;">📍 ${loc.city}</p>
                <div class="star-rating">${"★".repeat(loc.rating || 5)}${"☆".repeat(5-(loc.rating || 5))}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function showDetails(loc) {
    const body = document.getElementById('details-body');
    const imgUrl = (loc.image_url && loc.image_url.trim() !== "") 
            ? loc.image_url 
            : "https://via.placeholder.com/400x250?text=No+Image+Added";
    
    body.innerHTML = `
        <img src="${imgUrl}" style="width:100%; border-radius:15px; margin-bottom:15px; max-height:300px; object-fit:cover;">
        <h2 style="color:#bc002d;">${loc.name}</h2>
        <p><strong>City:</strong> ${loc.city}</p>
        <div class="star-rating">${"★".repeat(loc.rating || 5)}${"☆".repeat(5-(loc.rating || 5))}</div>
        <p style="margin:15px 0;">${loc.description || 'No description provided.'}</p>
        <a href="${loc.map_url || '#'}" target="_blank" class="nav-link-btn">📍 View on Google Maps</a>
    `;
    detailsModal.style.display = "block";
}

function renderFilters() {
    const filterContainer = document.getElementById('city-filters');
    const cities = ['all', ...new Set(allLocations.map(l => l.city))];
    filterContainer.innerHTML = '';
    
    cities.forEach(city => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${city === 'all' ? 'active' : ''}`;
        btn.innerText = city.charAt(0).toUpperCase() + city.slice(1);
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayLocations(city === 'all' ? allLocations : allLocations.filter(l => l.city === city));
        };
        filterContainer.appendChild(btn);
    });
}

document.getElementById('add-location-form').onsubmit = async (e) => {
    e.preventDefault();
    const newLoc = {
        name: document.getElementById('name').value,
        city: document.getElementById('city').value,
        rating: parseInt(document.getElementById('rating').value) || 5,
        image_url: document.getElementById('image_url').value,
        description: document.getElementById('description').value,
        map_url: document.getElementById('map_url').value,
        visited: true
    };
    const res = await fetch('http://127.0.0.1:5000/locations/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoc)
    });
    if (res.ok) {
        addModal.style.display = "none";
        document.getElementById('add-location-form').reset();
        fetchLocations();
    }
};

window.onload = fetchLocations;