🇯🇵 Beyond Tokyo | Full-Stack Japan Explorer
Have you ever tried planning your "big trip" and found yourself completely lost between dozens of websites, YouTube videos, and ticket booking links?

I’ve been there. After returning from my trip to Japan, I decided to take that frustration and turn it into my first real-world application. Beyond Tokyo was born to solve that fragmentation, centralizing the chaos into a single, sleek, and secure platform designed for the modern traveler in the "Land of the Rising Sun."

🎯 The Mission
This is a Full-Stack MVP developed in less than a week. It demonstrates the ability to move fast from a personal pain point to a functional product, focusing on a clean user experience and a secure backend architecture.

🛠️ Tech Stack
Backend: Python (Flask)

Database: MongoDB Atlas (NoSQL)

Frontend: JavaScript (ES6+), CSS3 (Flex/Grid), HTML5

Integrations: Pexels API & Google Maps API

🚀 Key Features
Full CRUD Management: Seamless data handling via MongoDB Atlas.

Dynamic UX: Real-time filtering by City/Category and a custom Dark Mode toggle.

API Automation: Dynamic image fetching to ensure every destination looks stunning without manual uploads.

Secure Architecture: Implemented a Backend Proxy to protect sensitive API keys from being exposed on the client side.

💡 Technical Highlight: Security First
A core challenge was utilizing external APIs without exposing my credentials in the browser.
The Solution: I built a Flask-based bridge. The frontend requests data from my own server, which then handles the authenticated API calls server-side. This ensures that environment variables stay hidden and the app remains production-ready.

⚙️ Quick Setup
Clone & Install:

Bash
git clone https://github.com/YourUsername/Beyond-Tokyo.git
pip install -r requirements.txt
Environment Variables:
Create a .env file with your MONGO_URI and PEXELS_API_KEY.

Run:

Bash
python app.py
💬 Feedback
As a Junior developer, I’m always looking to refine my logic. Whether it's a cleaner way to handle the Frontend state or a more efficient Backend structure, I’d love to hear your thoughts!