from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from routes import locations_bp
from error_handlers import register_error_handlers
import os
import requests

#Creating the brain of the app, show of the flask that control all of the communication
app = Flask(__name__, template_folder="templates", static_folder="templates", static_url_path="")
CORS(app)

#Connect the error handler
register_error_handlers(app)

#Prevents the flask to order the formats by the a-z order in JSON so we get the format we want
app.json.sort_keys = False 

#Connect an extension of the paths Blueprints to the main app and determines they all start with locations
app.register_blueprint(locations_bp, url_prefix="/locations") 

#Defines a basic path (home page) so that we know the server is live when we enter the main address
@app.route("/")
def home():
        return render_template("index.html")

# Server-side proxy for Pexels so API key is never exposed to browser
@app.route("/pexels/search", methods=["GET"])
def pexels_search():
    query = request.args.get("query", "").strip()
    per_page = request.args.get("per_page", "1")

    if not query:
        return jsonify({"error": "Missing query parameter"}), 400

    pexels_key = os.getenv("PEXELS_API_KEY")
    if not pexels_key:
        return jsonify({"error": "PEXELS_API_KEY is not configured"}), 500

    try:
        pexels_response = requests.get(
            "https://api.pexels.com/v1/search",
            params={"query": query, "per_page": per_page},
            headers={"Authorization": pexels_key},
            timeout=10,
        )
        return jsonify(pexels_response.json()), pexels_response.status_code
    except requests.RequestException:
        return jsonify({"error": "Could not reach Pexels service"}), 502

#Checks whether we ran the file directly (and not imported it) and if so - runs the server in test mode - debug
if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")