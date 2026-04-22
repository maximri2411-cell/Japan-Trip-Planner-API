let allLocations = [];
 
const addModal = document.getElementById("location-modal");
const detailsModal = document.getElementById("details-modal");
 
document.querySelector(".close-modal").onclick = () => addModal.style.display = "none";
document.querySelector(".close-details").onclick = () => detailsModal.style.display = "none";
document.getElementById("open-modal-btn").onclick = () => addModal.style.display = "block";
 
document.getElementById('explore-btn').onclick = () => document.getElementById('locations-grid').scrollIntoView({ behavior: 'smooth' });
document.getElementById('tips-btn').onclick = () => document.getElementById('tips-section').scrollIntoView({ behavior: 'smooth' });
 
window.onclick = (e) => {
    if (e.target == addModal) addModal.style.display = "none";
    if (e.target == detailsModal) detailsModal.style.display = "none";
}
 
const PEXELS_API_KEY = 'jI8g2v4Sj9Ysf0UvLzr0Nvy2xKKeFRtke4oKKBGL2mnOe1oopDxXELrU';
const imageCache = {};
 
// ✅ async added
async function getSmartImageUrl(loc) {
    if (!loc) return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
 
    if (loc.image_url && loc.image_url.trim() !== "") return loc.image_url;
 
    const cacheKey = `${loc.name}-${loc.city}`;
    if (imageCache[cacheKey]) return imageCache[cacheKey];
 
    try {
        const query = encodeURIComponent(`${loc.name} ${loc.city} Japan`);
        const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1`, {
            headers: { Authorization: PEXELS_API_KEY }
        });
        const data = await response.json();
 
        if (data.photos && data.photos.length > 0) {
            const url = data.photos[0].src.large;
            imageCache[cacheKey] = url;
            return url;
        }
    } catch (err) {
        console.error("Pexels error:", err);
    }
 
    return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
}
 
 
async function fetchLocations() {
    try {
        const response = await fetch('http://127.0.0.1:5000/locations/all');
        allLocations = await response.json();
        updateDynamicFilters();
        displayLocations(allLocations);
    } catch (error) { console.error("Error fetching locations"); }
}
 
 
function updateDynamicFilters() {
    const citySelect = document.getElementById('filter-city');
    const categorySelect = document.getElementById('filter-category');
 
    const cities = [...new Set(allLocations.map(l => l.city).filter(c => c))];
    const categories = [...new Set(allLocations.map(l => l.category).filter(cat => cat))];
 
    citySelect.innerHTML = '<option value="all">All Cities</option>';
    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.innerText = city;
        citySelect.appendChild(opt);
    });
 
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        categorySelect.appendChild(opt);
    });
}
 
 
async function applyFilters() {
    const city = document.getElementById('filter-city').value;
    const category = document.getElementById('filter-category').value;
    const rating = document.getElementById('filter-rating').value;
 
    let url = 'http://127.0.0.1:5000/locations/all?';
    if (city !== 'all') url += `city=${city}&`;
    if (category !== 'all') url += `category=${category}&`;
    if (rating !== '0') url += `rating=${rating}&`;
 
    try {
        const response = await fetch(url);
        const filteredData = await response.json();
        displayLocations(filteredData);
    } catch (error) { console.error("Filter error:", error); }
}
 
document.getElementById('filter-city').onchange = applyFilters;
document.getElementById('filter-category').onchange = applyFilters;
document.getElementById('filter-rating').onchange = applyFilters;
 
 
// ✅ async added + forEach changed to for...of so await works
async function displayLocations(locations) {
    const container = document.getElementById('locations-container');
    container.innerHTML = '';
 
    for (const loc of locations) {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => showDetails(loc);
 
        const imgUrl = await getSmartImageUrl(loc); // ✅ await now works
 
        card.innerHTML = `
            <img src="${imgUrl}" class="card-img-mini" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';">
            <div class="card-text">
                <h3 style="color:#bc002d;">${loc.name}</h3>
                <p style="font-size:0.9rem; color:#888;">📍 ${loc.city} | ${loc.category || 'General'}</p>
                <div class="star-rating">${"★".repeat(loc.rating || 5)}${"☆".repeat(5-(loc.rating || 5))}</div>
            </div>
        `;
        container.appendChild(card);
    }
}
 
 
// ✅ async added
async function showDetails(loc) {
    const body = document.getElementById('details-body');
 
    const imgUrl = await getSmartImageUrl(loc); // ✅ await now works
 
    const mapQuery = encodeURIComponent(`${loc.name} ${loc.city} Japan`);
    const googleMapsLink = (loc.map_url && loc.map_url.startsWith('http'))
        ? loc.map_url
        : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
 
    body.innerHTML = `
        <img src="${imgUrl}" style="width:100%; border-radius:15px; margin-bottom:15px; max-height:350px; object-fit:cover;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';">
        <h2 style="color:#bc002d;">${loc.name}</h2>
        <p><strong>City:</strong> ${loc.city} | <strong>Category:</strong> ${loc.category || 'General'}</p>
        <div class="star-rating">${"★".repeat(loc.rating || 5)}${"☆".repeat(5-(loc.rating || 5))}</div>
        <p style="margin:15px 0; line-height:1.8;">${loc.description || 'No description provided.'}</p>
        <a href="${googleMapsLink}" target="_blank" class="nav-link-btn">📍 View on Google Maps</a>
    `;
    detailsModal.style.display = "block";
}
 
 
document.getElementById('add-location-form').onsubmit = async (e) => {
    e.preventDefault();
    const newLoc = {
        name: document.getElementById('name').value,
        city: document.getElementById('city').value,
        category: document.getElementById('category').value,
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
 
 
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;
 
darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        darkModeToggle.innerHTML = "Light Mode";
        localStorage.setItem('theme', 'dark');
    } else {
        darkModeToggle.innerHTML = "Dark Mode";
        localStorage.setItem('theme', 'light');
    }
});
 
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    darkModeToggle.innerHTML = "Light Mode";
}
 
window.onload = fetchLocations;
 