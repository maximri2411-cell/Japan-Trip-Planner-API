from flask import Flask
from routes import locations_bp
from db_config import locations_collection 

app = Flask(__name__)

app.register_blueprint(locations_bp, url_prefix="/locations") #Here it says that everthing in the bluprint that calld "locations_bp" must start with "locations"

@app.route("/")
def home():
    return {"message": "Welcome to My Japan Trip API"} 

if __name__ == "__main__":
    app.run(debug=True)