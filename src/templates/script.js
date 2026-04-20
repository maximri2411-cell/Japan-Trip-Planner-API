function navigateTo(tool) {
    let url = "";
    if (tool === 'currency') {
        url = "https://www.xe.com/currencyconverter/convert/?Amount=1&From=ILS&To=JPY";
    } else if (tool === 'translate') {
        url = "https://translate.google.com/?sl=iw&tl=ja";
    } else if (tool === 'hotels') {
        url = "https://www.booking.com/country/jp.html";
    }
    
    if (url) {
        window.location.href = url;
    }
}

async function fetchLocations() {
    try {
        const response = await fetch('http://127.0.0.1:5000/locations/all');
        const data = await response.json();
        const container = document.getElementById('locations-container');
        
        container.innerHTML = ''; 

        data.forEach(loc => {
            const mapUrl = loc.map_url ? loc.map_url : `https://www.google.com/maps/search/${encodeURIComponent(loc.name + " Japan")}`;            
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

document.getElementById('add-new-btn').addEventListener('click', () => {
    document.querySelector('.add-location-section').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('tips-btn').addEventListener('click', () => {
    const tipsSection = document.getElementById('tips-section');
    tipsSection.style.display = 'block';
    tipsSection.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('add-location-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newLocation = {
        name: document.getElementById('name').value,
        city: document.getElementById('city').value,
        category: document.getElementById('category').value,
        rating: parseInt(document.getElementById('rating').value),
        description: document.getElementById('description').value,
        map_url: document.getElementById('map_url').value,
        visited: false
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/locations/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLocation)
        });

        if (response.ok) {
            alert('Location added successfully!');
            document.getElementById('add-location-form').reset();
            fetchLocations();
        } else {
            const error = await response.json();
            alert('Error: ' + (error.msg || error.description));
        }
    } catch (err) {
        console.error('Submission error:', err);
        alert('Failed to connect to the server.');
    }
});

window.onload = fetchLocations;