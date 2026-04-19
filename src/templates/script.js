async function fetchLocations() {
    try {
        const response = await fetch('http://127.0.0.1:5000/locations/all');
        const data = await response.json();
        const container = document.getElementById('locations-container');
        
        container.innerHTML = ''; 

        data.forEach(loc => {
            const mapUrl = loc.map_url ? loc.map_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + " Japan")}`;            
            const card = document.createElement('div');
            card.className = 'location-card'; 
            card.innerHTML = `
                <div class="card-content">
                    <h3>${loc.name}</h3>
                    <p>${loc.description || 'No description available yet.'}</p>
                    <a href="${mapUrl}" target="_blank" class="map-btn">
                        📍 View on Google Maps
                    </a>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

document.getElementById('explore-btn').addEventListener('click', () => {
    document.getElementById('locations-grid').scrollIntoView({ behavior: 'smooth' });
});

window.onload = fetchLocations;