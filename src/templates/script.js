let allLocations = [];

// Fetch Weather
async function fetchWeather() {
    try {
        // בשימוש ב-API אמיתי תחליף את ה-URL. כאן השתמשתי בסימולציה לטוקיו
        const weatherDiv = document.getElementById('weather-widget');
        weatherDiv.innerHTML = `Tokyo: 18°C ☀️ | Clear Sky`;
    } catch (e) { console.log("Weather error"); }
}

// Modals
const addModal = document.getElementById("location-modal");
const detailsModal = document.getElementById("details-modal");

document.getElementById("open-modal-btn").onclick = () => addModal.style.display = "block";
document.querySelector(".close-modal").onclick = () => addModal.style.display = "none";
document.querySelector(".close-details").onclick = () => detailsModal.style.display = "none";

window.onclick = (e) => {
    if (e.target == addModal) addModal.style.display = "none";
    if (e.target == detailsModal) detailsModal.style.display = "none";
}

// Fetch Data from Backend
async function fetchLocations() {
    try {
        const response = await fetch('http://127.0.0.1:5000/locations/all');
        allLocations = await response.json();
        renderFilters();
        displayLocations(allLocations);
    } catch (error) {
        console.error("Connection error");
    }
}

function displayLocations(locations) {
    const container = document.getElementById('locations-container');
    container.innerHTML = '';
    
    locations.forEach(loc => {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => showDetails(loc);
        
        // שימוש בתמונה מה-DB או תמונה דיפולטיבית של יפן
        const imgUrl = loc.image_url || 'https://images.unsplash.com/photo-1528164344705-4754268799af?q=80&w=500&auto=format';
        
        card.innerHTML = `
            <img src="${imgUrl}" class="card-img-mini">
            <div class="card-text">
                <h3 style="color:#bc002d;">${loc.name}</h3>
                <p style="font-size:0.8rem; color:#888;">📍 ${loc.city}</p>
                <div class="star-rating">${"★".repeat(loc.rating || 5)}${"☆".repeat(5-(loc.rating || 5))}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function showDetails(loc) {
    const body = document.getElementById('details-body');
    const imgUrl = loc.image_url || 'https://images.unsplash.com/photo-1528164344705-4754268799af?q=80&w=800&auto=format';
    
    body.innerHTML = `
        <img src="${imgUrl}">
        <h2 style="color:#bc002d;">${loc.name}</h2>
        <p><strong>City:</strong> ${loc.city}</p>
        <div class="star-rating">${"★".repeat(loc.rating || 5)}${"☆".repeat(5-(loc.rating || 5))}</div>
        <p style="margin:15px 0;">${loc.description || 'Exploring the beauty of Japan...'}</p>
        <div style="display:flex; gap:10px;">
            <a href="${loc.map_url || '#'}" target="_blank" class="nav-link-btn" style="flex:2;">📍 View on Google Maps</a>
            <button class="share-btn" onclick="shareLocation('${loc.name}')" style="flex:1;">🔗 Share</button>
        </div>
    `;
    detailsModal.style.display = "block";
}

function shareLocation(name) {
    navigator.clipboard.writeText(`Check out this place in Japan: ${name}`);
    alert("Location details copied to clipboard!");
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

// Form Submission
document.getElementById('add-location-form').onsubmit = async (e) => {
    e.preventDefault();
    const newLoc = {
        name: document.getElementById('name').value,
        city: document.getElementById('city').value,
        rating: parseInt(document.getElementById('rating').value),
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
        fetchLocations();
    }
};

window.onload = () => {
    fetchLocations();
    fetchWeather();
};