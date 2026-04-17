from flask import Flask
from routes import locations_bp
from db_config import locations_collection # ייבוא מהקובץ החדש

app = Flask(__name__)

app.register_blueprint(locations_bp, url_prefix='/locations')

@app.route('/')
def home():
    return {"message": "Welcome to My Japan Trip API"} 

if __name__ == "__main__":
    app.run(debug=True)