async function fetchLocations() {
    try {
        console.log("Connecting to API...");
        
        const response = await fetch('http://127.0.0.1:5000/locations/all');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log("Data received:", data);

        const container = document.getElementById('locations-container');
        container.innerHTML = `
            <div style="text-align: center; color: #28a745; background: #d4edda; padding: 20px; border-radius: 10px;">
                <h3>Success!</h3>
                <p>Connected to your backend. Found ${data.length} locations in Japan.</p>
            </div>
        `;

    } catch (error) {
        console.error("Fetch error:", error);
        const container = document.getElementById('locations-container');
        container.innerHTML = `<p style="color: red; text-align: center;">Error: Could not connect to the server. Make sure your Flask app is running!</p>`;
    }
}

window.onload = fetchLocations;