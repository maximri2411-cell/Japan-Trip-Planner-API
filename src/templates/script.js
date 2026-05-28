const imageCache = {};



// This is goin to keep all the data that will came from the server
let allLocations = [];
// ============================================


// Pulling off elements of models like jumping windos frome html
const addModal = document.getElementById("location-modal");
const detailsModal = document.getElementById("details-modal");
 

// ============================================
// The X button to close windows

document.querySelector(".close-modal").onclick = () => {
    addModal.style.display = "none";
    document.getElementById('add-location-form').reset(); // Clean in the exit // Clean fields in the exit
};

document.querySelector(".close-details").onclick = () =>
    detailsModal.style.display = "none";
// ============================================


// ============================================
// Opening model of adding new place

document.getElementById("open-modal-btn").onclick = () =>
    addModal.style.display = "block";
// ============================================


// ============================================
// Smooth scroll in hero section 

document.getElementById('explore-btn').onclick = () => 
    document.getElementById('locations-section').scrollIntoView({ behavior: 'smooth' });

document.getElementById('tips-btn').onclick = () =>
    document.getElementById('tips-section').scrollIntoView({ behavior: 'smooth' });
// ============================================

// ============================================
// Closing model by pressing outside the window

window.onclick = (e) => {
    if (e.target == addModal) addModal.style.display = "none";
    if (e.target == detailsModal) detailsModal.style.display = "none";
}
// ============================================


// ============================================
// PEXELS key - auto bring pict
// ============================================


// ============================================
// Search bar

document.getElementById('search-input').addEventListener('input', () => {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allLocations.filter(loc =>
        loc.name.toLowerCase().includes(query) ||
        loc.city.toLowerCase().includes(query)
    );
    displayLocations(filtered); // New presentation of the filtered cards
});
// ============================================


// ============================================
// Sort

document.getElementById('sort-select').addEventListener('change', () => {
    const sortVal = document.getElementById('sort-select').value;
    let sorted = [...allLocations]; // Creating new copy in order not destroy the original

    if (sortVal === 'rating-desc') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortVal === 'rating-asc') sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    if (sortVal === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortVal === 'city-asc') sorted.sort((a, b) => a.city.localeCompare(b.city));

    displayLocations(sorted);
});
// ============================================


// ============================================
// Spinners helpers

function showSpinner() { document.getElementById('spinner').style.display = 'flex'; }

function hideSpinner() { document.getElementById('spinner').style.display = 'none'; }
// ============================================


// ============================================
// Smart search - first in DB and if it dosent have, then goes to PEXELS

async function getSmartImageUrl(loc) {
    if (!loc) return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
 
    if (loc.image_url && loc.image_url.trim() !== "") return loc.image_url;
 
    const cacheKey = `${loc.name}-${loc.city}`;
    if (imageCache[cacheKey]) return imageCache[cacheKey]; // Check in stored memory
 
    try {
        const query = encodeURIComponent(`${loc.name} ${loc.city} Japan`);
        const response = await fetch(`/pexels/search?query=${query}&per_page=1`);
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
// ============================================


// ============================================
// Fetch from backend first

async function fetchLocations() {
    showSpinner();
    try {
        const response = await fetch('/locations/all');
        allLocations = await response.json();
        updateDynamicFilters(); // Update the city list and Categories
        await displayLocations(allLocations);
    } catch (error) {
        console.error("Error fetching locations");
    } finally {
        hideSpinner();
    }
}
// ============================================


// ============================================
// Dynamic filters

function updateDynamicFilters() {
    const citySelect = document.getElementById('filter-city');
    const categorySelect = document.getElementById('filter-category');
    
    // Set of uniq city and category
    const cities = [...new Set(allLocations.map(l => l.city).filter(c => c))];
    const categories = [...new Set(allLocations.map(l => l.category).filter(cat => cat))];
    
    // Empty and fill new options to pick 
    citySelect.innerHTML = '<option value="all">All Cities</option>';
    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.innerText = city;
        citySelect.appendChild(opt);
    });
 
    // And same on category
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        categorySelect.appendChild(opt);
    });
}
// ============================================


// ============================================
// Apply filters (Query parameters)

async function applyFilters() {
    const city = document.getElementById('filter-city').value;
    const category = document.getElementById('filter-category').value;
    const rating = document.getElementById('filter-rating').value;
 
    let url = '/locations/all?';
    if (city !== 'all') url += `city=${city}&`;
    if (category !== 'all') url += `category=${category}&`;
    if (rating !== '0') url += `rating=${rating}&`;
 
    showSpinner();
    try {
        const response = await fetch(url);
        const filteredData = await response.json();
        await displayLocations(filteredData);
    } catch (error) {
        console.error("Filter error:", error);
    } finally { hideSpinner(); }
}
// ============================================

 
document.getElementById('filter-city').onchange = applyFilters;
document.getElementById('filter-category').onchange = applyFilters;
document.getElementById('filter-rating').onchange = applyFilters;

// ============================================
// Build data cards and input to html (DOM Manipulation)

async function displayLocations(locations) {
    const container = document.getElementById('locations-container');
    container.innerHTML = '';

    // No results message
    if (!locations || locations.length === 0) {
        container.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 60px 20px;
                color: #aaa;
            ">
                <div style="font-size: 3rem;">🗾</div>
                <h3 style="margin-top: 15px; color: #bc002d;">No locations found</h3>
                <p style="margin-top: 8px;">Try changing your filters or search term</p>
            </div>
        `;
        return;
    }
 
    for (const loc of locations) {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => showDetails(loc); // PResing it Opening details model
 
        const imgUrl = await getSmartImageUrl(loc);
 
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
// ============================================


// ============================================
// Show specific details model

async function showDetails(loc) {
    const body = document.getElementById('details-body');
 
    const imgUrl = await getSmartImageUrl(loc);
 
    const mapQuery = encodeURIComponent(`${loc.name} ${loc.city} Japan`);
    const googleMapsLink = (loc.map_url && loc.map_url.startsWith('http'))
        ? loc.map_url
        : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
 
    body.innerHTML = `
        <img src="${imgUrl}" style="width:100%; border-radius:15px; margin-bottom:15px; max-height:350px; object-fit:cover;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';">
        
        <div id="details-view-content">
            <h2 style="color:#bc002d;">${loc.name}</h2>
            <p><strong>City:</strong> ${loc.city} | <strong>Category:</strong> ${loc.category || 'General'}</p>
            <div class="star-rating">${"★".repeat(loc.rating || 5)}${"☆".repeat(5-(loc.rating || 5))}</div>
            <p style="margin:15px 0; line-height:1.8;">${loc.description || 'No description provided.'}</p>
            <a href="${googleMapsLink}" target="_blank" class="nav-link-btn">📍 View on Google Maps</a>
            
            <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
                <button id="edit-loc-btn" class="nav-link-btn" style="background: #d48b00 !important; width: 45%; margin-top: 0;">✏️ Edit</button>
                <button id="delete-loc-btn" class="nav-link-btn" style="background: #9d0f0f !important; width: 45%; margin-top: 0;">🗑️ Delete</button>
            </div>
        </div>

        <div id="details-edit-form" style="display: none; text-align: left;">
            <h2 style="color:#bc002d; text-align: center; margin-bottom: 15px;">Edit Destination</h2>
            
            <label style="font-weight: 600; font-size: 0.85rem; color: #bc002d;">Name</label>
            <input type="text" id="edit-name" value="${loc.name}" required>
            
            <label style="font-weight: 600; font-size: 0.85rem; color: #bc002d;">City</label>
            <input type="text" id="edit-city" value="${loc.city}" required>
            
            <label style="font-weight: 600; font-size: 0.85rem; color: #bc002d;">Category</label>
            <input type="text" id="edit-category" value="${loc.category || 'General'}">
            
            <label style="font-weight: 600; font-size: 0.85rem; color: #bc002d;">Rating (1-5)</label>
            <input type="number" id="edit-rating" value="${loc.rating || 5}" min="1" max="5">
            
            <label style="font-weight: 600; font-size: 0.85rem; color: #bc002d;">Image URL (Optional)</label>
            <input type="text" id="edit-image-url" value="${loc.image_url || ''}">
            
            <label style="font-weight: 600; font-size: 0.85rem; color: #bc002d;">Description</label>
            <textarea id="edit-description" rows="3">${loc.description || ''}</textarea>
            
            <label style="font-weight: 600; font-size: 0.85rem; color: #bc002d;">Google Maps URL</label>
            <input type="url" id="edit-map-url" value="${loc.map_url || ''}">
            
            <div style="display: flex; gap: 15px; margin-top: 15px;">
                <button id="save-edit-btn" style="background: linear-gradient(135deg, #bc002d, #ff4d4d); color: white; border: none; border-radius: 8px; padding: 12px; font-weight: 600; width: 50%; cursor: pointer; font-family: inherit;">Save</button>
                <button id="cancel-edit-btn" style="background: #ccc; color: #333; border: none; border-radius: 8px; padding: 12px; font-weight: 600; width: 50%; cursor: pointer; font-family: inherit;">Cancel</button>
            </div>
        </div>
    `;
    
    // Bind buttons
    const viewDiv = document.getElementById('details-view-content');
    const editDiv = document.getElementById('details-edit-form');
    const editBtn = document.getElementById('edit-loc-btn');
    const deleteBtn = document.getElementById('delete-loc-btn');
    const saveBtn = document.getElementById('save-edit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    editBtn.onclick = () => {
        viewDiv.style.display = 'none';
        editDiv.style.display = 'block';
    };

    cancelBtn.onclick = () => {
        viewDiv.style.display = 'block';
        editDiv.style.display = 'none';
    };

    deleteBtn.onclick = async () => {
        if (confirm(`Are you sure you want to delete "${loc.name}"?`)) {
            try {
                const res = await fetch(`/locations/delete/${loc._id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    alert("Location deleted successfully!");
                    detailsModal.style.display = "none";
                    await fetchLocations();
                } else {
                    const err = await res.json();
                    alert("Failed to delete: " + (err.message || err.error || "Unknown error"));
                }
            } catch (err) {
                console.error("Delete error:", err);
                alert("Could not connect to the server.");
            }
        }
    };

    saveBtn.onclick = async () => {
        const updatedLoc = {
            name: document.getElementById('edit-name').value.trim(),
            city: document.getElementById('edit-city').value.trim(),
            category: document.getElementById('edit-category').value.trim(),
            rating: parseInt(document.getElementById('edit-rating').value) || 5,
            image_url: document.getElementById('edit-image-url').value.trim(),
            description: document.getElementById('edit-description').value.trim(),
            map_url: document.getElementById('edit-map-url').value.trim()
        };

        if (!updatedLoc.name || !updatedLoc.city) {
            alert("Name and City are required!");
            return;
        }

        try {
            const res = await fetch(`/locations/update/${loc._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedLoc)
            });

            if (res.ok) {
                alert("Location updated successfully!");
                detailsModal.style.display = "none";
                await fetchLocations();
            } else {
                const err = await res.json();
                alert("Failed to update: " + (err.message || err.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Update error:", err);
            alert("Could not connect to the server.");
        }
    };

    detailsModal.style.display = "block";
}
// ============================================


// ============================================
// Add new location POST

document.getElementById('add-location-form').onsubmit = async (e) => {
    e.preventDefault();

    console.log("Submit button pressed") // Check if the button is respose 

    // Data gather
    const newLoc = {
        name: document.getElementById('name').value,
        city: document.getElementById('city').value,
        category: document.getElementById('category') ? document.getElementById('category').value : "General",
        rating: parseInt(document.getElementById('rating').value) || 5,
        image_url: document.getElementById('image_url').value,
        description: document.getElementById('description').value,
        map_url: document.getElementById('map_url').value,
        visited: true
    };

    console.log("Sending data:", newLoc);

    try {
    const res = await fetch('/locations/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoc) // The object is turning to json for the server
    });

    if (res.ok) {
            alert("Location added successfully!"); // visual message of success
            addModal.style.display = "none";
            document.getElementById('add-location-form').reset(); // Clean the fileds
            await fetchLocations(); // Refresh
        } else {
            const errorData = await res.json();
            alert("Server error: " + (errorData.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Connection error:", err);
        alert("Could not connect to the server, check your flask");
    }
};
// ============================================


// ============================================
// Dark mode

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
// ============================================


// ============================================
// Check if the user used the dark mode last time been in the webb

if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    darkModeToggle.innerHTML = "Light Mode";
}
// ============================================
 

// Active the main function in realoading page
window.onload = async () => {
    await fetchLocations();
};