from flask import Flask, render_template
from routes import locations_bp
from db_config import locations_collection 

#Creating the brain of the app, show of the flask that control all of the communication
app = Flask(__name__)

#Prevents the flask to order the formats by the a-z order in JSON so we get the format we want
app.json.sort_keys = False 

#Connect an extension of the paths Blueprints to the main app and determines they all start with locations
app.register_blueprint(locations_bp, url_prefix="/locations") 

#Defines a basic path (home page) so that we know the server is live when we enter the main address
@app.route("/")
def home():
        return render_template("index_html")

#Checks whether we ran the file directly (and not imported it) and if so - runs the server in test mode - debug
if __name__ == "__main__":
    app.run(debug=True)