🇯🇵 Beyond Tokyo | Full-Stack Japan Explorer
Beyond Tokyo is a full-stack web application designed to manage and discover travel destinations across Japan. This project demonstrates a complete end-to-end development process, from NoSQL data management to a dynamic, secure user interface.

🎯 Key Features
Full CRUD Management: Seamless data handling with MongoDB Atlas.

Data Security: Implemented a Backend Proxy to hide sensitive API keys (Pexels) from the client-side.

Dynamic UX: Real-time filtering by City/Category and a custom Dark Mode toggle using CSS variables.

API Automation: Automated image fetching based on location names to enhance the visual experience.

🛠️ Tech Stack
Server: Python (Flask)

Database: MongoDB Atlas

Frontend: JavaScript (ES6+), CSS3 (Flex/Grid), HTML5

APIs: Pexels API, Google Maps

🚀 Quick Setup
Install dependencies: pip install -r requirements.txt

Environment Variables: Create a .env file with MONGO_URI and PEXELS_API_KEY.

Run the app: python app.py

💡 Technical Highlight: Secure API Proxy
A core challenge was utilizing external APIs without exposing credentials. I solved this by creating a Flask bridge route. This architecture ensures that environment variables are strictly accessed server-side, keeping the application secure and production-ready.

💬 Feedback & Contributions
I am always looking to improve! If you have any suggestions, performance optimizations, or clean-code recommendations, feel free to open an issue or submit a pull request. Feedback on the API architecture or the Frontend logic is highly appreciated.