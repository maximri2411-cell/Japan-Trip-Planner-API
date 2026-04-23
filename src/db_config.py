import os
from pymongo import MongoClient
from dotenv import load_dotenv

#Bring the values from .env to the memory of the project
load_dotenv() 

#Bring the address connaction to mongo
mongo_uri = os.getenv("MONGO_URI")

#Create client and its the main pipe for the app to talk with mongo server
client = MongoClient(mongo_uri)

#Connecting to the data base with environment-aware name
default_db_name = "japan_trip"
db_name = os.getenv("MONGO_DB_NAME", default_db_name)

if os.getenv("TESTING", "").lower() == "true":
    db_name = os.getenv("TEST_MONGO_DB_NAME", "japan_trip_test")

db = client[db_name]

#went to the table "Collection" specific inside data base were we keep our locations
locations_collection = db["locations"]